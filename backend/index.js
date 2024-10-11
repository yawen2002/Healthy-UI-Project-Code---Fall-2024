import express from 'express';
import cors from 'cors';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import speech from '@google-cloud/speech';
import fetch from 'node-fetch';
import { glob } from 'glob';
import OpenAI from 'openai';
import Sentiment from 'sentiment';
import natural from 'natural';

const app = express();
const port = 10000;

export const YOUTUBE_API_KEY = "AIzaSyBe2x8I4dfMOn6Q2rhdNUQn_uQSCHv6Fpc"; 
export const FACT_CHECK_API_KEY = "AIzaSyDOWaD_QLWeN1hiI7cxWfQva5H6aUE2vZg"; 

app.use(express.json());

// CORS Configuration
app.use(cors({
    origin: 'http://localhost:5173',
    methods: 'GET,POST,PUT,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type,Authorization',
    credentials: true,
}));

app.options('*', cors());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const keyPath = path.join(__dirname, 'SpeechToTextAPI.json');
process.env.GOOGLE_APPLICATION_CREDENTIALS = keyPath;

const openai = new OpenAI({
    apiKey: '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'
});

const sentiment = new Sentiment();  

// Function to split audio into chunks
const splitAudioFile = (inputPath, outputPrefix, chunkSizeSec) => {
    return new Promise((resolve, reject) => {
        exec(`ffmpeg -i ${inputPath} -f segment -segment_time ${chunkSizeSec} -c copy ${outputPrefix}%03d.mp3`, (error, stdout, stderr) => {
            if (error) {
                reject(`ffmpeg error: ${stderr}`);
                return;
            }
            resolve();
        });
    });
};

// Function to clean up files after processing
const cleanUpFiles = (filePatterns) => {
    if (Array.isArray(filePatterns)) {
        filePatterns.forEach(pattern => {
            glob(pattern, (err, files) => {
                if (err) {
                    console.error(`Error finding files with pattern ${pattern}: ${err}`);
                    return;
                }
                files.forEach(filePath => {
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                        console.log(`Deleted file: ${filePath}`);
                    }
                });
            });
        });
    } else if (typeof filePatterns === 'string') {
        if (fs.existsSync(filePatterns)) {
            fs.unlinkSync(filePatterns);
            console.log(`Deleted file: ${filePatterns}`);
        } else {
            console.error(`File ${filePatterns} does not exist.`);
        }
    } else {
        console.error('Invalid file pattern or path provided for cleanup.');
    }
};

// Function to download video from a URL
const downloadVideo = async (videoUrl, outputPath) => {
    return new Promise((resolve, reject) => {
        exec(`yt-dlp -f bestvideo+bestaudio --merge-output-format mp4 -o ${outputPath} ${videoUrl}`, (error, stdout, stderr) => {
            console.log(`yt-dlp stdout: ${stdout}`);
            console.log(`yt-dlp stderr: ${stderr}`);
            if (error) {
                reject(`yt-dlp error: ${stderr}`);
                return;
            }
            resolve();
        });
    });
};

// Function to extract audio from a video file
const extractAudio = async (videoPath, audioPath) => {
    return new Promise((resolve, reject) => {
        exec(`ffmpeg -i ${videoPath} -q:a 0 -map a ${audioPath}`, (error, stdout, stderr) => {
            console.log(`ffmpeg stdout: ${stdout}`);
            console.log(`ffmpeg stderr: ${stderr}`);
            if (error) {
                reject(`ffmpeg error: ${stderr}`);
                return;
            }
            resolve();
        });
    });
};

// Function to transcribe audio files
const transcribeAudio = async (audioFiles, client) => {
    let fullTranscription = '';

    for (let j = 0; j < audioFiles.length; j++) {
        const audioFile = audioFiles[j];
        const file = fs.readFileSync(audioFile);
        const audioBytes = file.toString('base64');

        const audio = {
            content: audioBytes,
        };

        const config = {
            encoding: 'MP3',
            sampleRateHertz: 16000,
            languageCode: 'en-US',
        };

        const request = {
            audio: audio,
            config: config,
        };

        const [response] = await client.recognize(request);
        const transcription = response.results
            .map(result => result.alternatives[0].transcript)
            .join('\n');

        fullTranscription += transcription + ' ';
    }

    return fullTranscription;
};

// fact-checking using Google's Fact Check API
const factCheck = async (transcription) => {
    const apiUrl = `https://factchecktools.googleapis.com/v1alpha1/claims:search?query=${encodeURIComponent(transcription)}&key=${FACT_CHECK_API_KEY}`;
    const factCheckResponse = await fetch(apiUrl);
    
    if (!factCheckResponse.ok) {
        throw new Error(`Fact Check API Error: ${factCheckResponse.statusText}`);
    }

    const factCheckText = await factCheckResponse.text();

    let factCheckData;
    try {
        factCheckData = JSON.parse(factCheckText);
    } catch (error) {
        throw new Error(`Error parsing Fact Check API response: ${error}`);
    }

    return factCheckData;
};

// Function to analyze transcription
const analyzeWithChatGPT = async (transcription, factCheckData) => {
    const prompt = `
    The following text transcription has been checked for potential fake news using Google's Fact Check API. Here are the details:

    Transcription: "${transcription}"
    Fact Check Results: ${JSON.stringify(factCheckData)}

    Based on this information, explain why the content might be considered fake news. Provide additional context and suggest reliable sources for verification.
    `;

    const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 500,
    });

    return response.choices[0].message.content.trim();
};

// summarize transcription using ChatGPT
const summarizeVideoWithChatGPT = async (transcription) => {
    const prompt = `
    Summarize the following video transcription and suggest external sources where viewers can find more detailed information:

    Transcription: "${transcription}"
    `;

    const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 200,
    });

    return response.choices[0].message.content.trim();
};

// Function to perform sentiment analysis using the 'Sentiment' library
const analyzeSentiment = (transcription) => {
    const sentimentResult = sentiment.analyze(transcription);
    return {
        score: sentimentResult.score,
        comparative: sentimentResult.comparative,
        positive: sentimentResult.positive,
        negative: sentimentResult.negative,
    };
};

// Function to extract themes using NLP techniques
const extractThemes = (transcription) => {
    const tokenizer = new natural.WordTokenizer();
    const tokens = tokenizer.tokenize(transcription);

    const tfidf = new natural.TfIdf();
    tfidf.addDocument(tokens);

    const themes = new Set();

    tfidf.listTerms(0).forEach(item => {
        const term = item.term.toLowerCase();
        if (term.length > 2 && !natural.stopwords.includes(term)) {
            themes.add(term);
        }
    });

    // Expand themes with related terms (e.g., using a thesaurus or word embeddings)
    const expandedThemes = Array.from(themes).flatMap(theme => {
        return [theme, ...getRelatedTerms(theme)];
    });

    return expandedThemes;
};

// Function to transcribe a YouTube video by its ID
const getVideoTranscription = async (videoId) => {
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const videoPath = `video_${videoId}.mp4`;
    const audioPath = `audio_${videoId}.mp3`;
    const audioChunksPrefix = `audio_chunk_${videoId}_`;

    try {
        // Download the video
        await downloadVideo(videoUrl, videoPath);

        if (!fs.existsSync(videoPath)) {
            throw new Error(`Video file ${videoPath} does not exist after download.`);
        }

        // Extract the audio from the video
        await extractAudio(videoPath, audioPath);

        // Split the audio into chunks
        await splitAudioFile(audioPath, audioChunksPrefix, 60);

        // Initialize the Google Cloud Speech client
        const client = new speech.SpeechClient();
        const audioFiles = glob.sync(`${audioChunksPrefix}*.mp3`);

        // Transcribe the audio files
        const fullTranscription = await transcribeAudio(audioFiles, client);

        // Cleanup the temporary files
        cleanUpFiles([`${audioChunksPrefix}*.mp3`, videoPath, audioPath]);

        return fullTranscription;

    } catch (error) {
        console.error(`Error processing video ${videoId}:`, error);
        cleanUpFiles([`${audioChunksPrefix}*.mp3`, videoPath, audioPath]);
        return '';
    }
};

// Function to retrieve videos with similar themes using YouTube Data API
const retrieveSimilarVideos = async (themes) => {
    const topThemes = themes.slice(0, 3).join(' '); // Limit to top 3 themes for better focus
    const apiUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(topThemes)}&type=video&key=${YOUTUBE_API_KEY}&maxResults=10`;

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`YouTube API Error: ${response.statusText}`);
        }
        const data = await response.json();

        const videos = await Promise.all(
            data.items.map(async (item) => {
                const videoId = item.id.videoId;
                const title = item.snippet.title;

                // Fetch the video transcription using the logic similar to the main video
                const transcription = await getVideoTranscription(videoId);
                
                // Perform sentiment analysis on the transcription
                const sentimentResult = analyzeSentiment(transcription);

                return {
                    videoId,
                    title,
                    transcription,
                    sentimentScore: sentimentResult.comparative // Use the comparative score as the sentiment score
                };
            })
        );

        return videos;
    } catch (error) {
        console.error('Error retrieving similar videos:', error);
        return [];
    }
};

// Utility function to get related terms for theme expansion 
const getRelatedTerms = (theme) => {
    const relatedTerms = {
        "climate": ["environment", "global warming", "sustainability"],
    };
    return relatedTerms[theme] || [];
};

// function to get moderate videos
const getModerateVideos = (videos, originalSentimentScore) => {
    return videos
        .filter(video => 
            Math.abs(video.sentimentScore) < Math.abs(originalSentimentScore) && 
            Math.abs(video.sentimentScore) < 0.1 
        )
        .sort((a, b) => Math.abs(a.sentimentScore) - Math.abs(b.sentimentScore));
};

app.post('/check-fake-news', async (req, res) => {
    const { videoUrl } = req.body;

    if (!videoUrl) {
        return res.status(400).send('Video URL is required');
    }

    const videoPath = 'video.mp4';  
    const audioPath = 'audio.mp3';
    const audioChunksPrefix = 'audio_chunk_';

    try {
        console.log('Downloading video...');
        await downloadVideo(videoUrl, videoPath);

        if (!fs.existsSync(videoPath)) {
            throw new Error(`Video file ${videoPath} does not exist after download.`);
        }

        console.log('Extracting audio...');
        await extractAudio(videoPath, audioPath);

        console.log('Splitting audio into chunks...');
        await splitAudioFile(audioPath, audioChunksPrefix, 60);

        const client = new speech.SpeechClient();
        const audioFiles = glob.sync(`${audioChunksPrefix}*.mp3`);

        console.log('Transcribing audio...');
        const fullTranscription = await transcribeAudio(audioFiles, client);
        console.log(`Full Transcription: ${fullTranscription}`);

        console.log('Performing sentiment analysis...');
        const sentimentResult = analyzeSentiment(fullTranscription);
        console.log(`Sentiment Analysis Result: ${JSON.stringify(sentimentResult)}`);

        console.log('Extracting themes...');
        const themes = extractThemes(fullTranscription);
        console.log(`Extracted Themes: ${themes}`);

        console.log('Retrieving similar videos...');
        const similarVideos = await retrieveSimilarVideos(themes);
        console.log(`Similar Videos: ${JSON.stringify(similarVideos)}`);

        console.log('Filtering moderate videos...');
        const moderateVideos = getModerateVideos(similarVideos, sentimentResult.comparative);
        console.log(`Moderate Videos: ${JSON.stringify(moderateVideos)}`);

        console.log('Performing fact-checking...');
        const factCheckData = await factCheck(fullTranscription);

        let isFakeNews = false;
        let explanation = '';
        let chatGptAnalysis = '';

        if (factCheckData.claims && factCheckData.claims.length > 0) {
            isFakeNews = true;
            explanation = factCheckData.claims.map(claim => 
                `Claim: ${claim.text}\nRating: ${claim.claimReview[0].textualRating}\nReviewer: ${claim.claimReview[0].publisher.name}`).join('\n\n');

            chatGptAnalysis = await analyzeWithChatGPT(fullTranscription, factCheckData);

            res.send({
                transcription: fullTranscription,
                factCheck: factCheckData,
                isFakeNews,
                explanation,
                chatGptAnalysis,
                sentiment: sentimentResult,
                moderateVideos,
            });

        } else {
            const summary = await summarizeVideoWithChatGPT(fullTranscription);
            console.log(`Generated Summary: ${summary}`);

            res.send({
                transcription: fullTranscription,
                factCheck: factCheckData,
                isFakeNews: false,
                summary,
                sentiment: sentimentResult,
                moderateVideos,
            });
        }

    } catch (error) {
        console.error('Error processing video:', error);
        res.status(500).send({ error: `Error processing video: ${error.message}` });
    } finally {
        console.log('Cleaning up temporary files...');
        cleanUpFiles([`${audioChunksPrefix}*.mp3`, videoPath, audioPath]);
    }
});



app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
