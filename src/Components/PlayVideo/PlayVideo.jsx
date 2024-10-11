import React, { useEffect, useState, useRef } from 'react';
import './PlayVideo.css';
import like from '../../assets/like.png';
import dislike from '../../assets/dislike.png';
import share from '../../assets/share.png';
import save from '../../assets/save.png';
import flagIcon from '../../assets/flag-icon.png';
import { API_KEY, value_converter } from '../../data';
import moment from 'moment';
import axios from 'axios';

const PlayVideo = ({ videoId }) => {
    const [apiData, setApiData] = useState(null);
    const [channelData, setChannelData] = useState(null);
    const [commentData, setCommentData] = useState([]);
    const [isFakeNews, setIsFakeNews] = useState(false);
    const [fakeNewsReason, setFakeNewsReason] = useState('');
    const [loading, setLoading] = useState(true);
    const [moreInfo, setMoreInfo] = useState('');
    const [moderateVideos, setModerateVideosState] = useState([]);
    const [showModerationVideos, setShowModerationVideos] = useState(false);
    const [showFullAnalysis, setShowFullAnalysis] = useState(false); 

    const cancelTokenSource = useRef(null);

    const checkFakeNews = async (videoUrl) => {
        if (cancelTokenSource.current) {
            cancelTokenSource.current.cancel("Operation canceled due to new request.");
        }
        
        cancelTokenSource.current = axios.CancelToken.source();
        
        try {
            setLoading(true);
            setIsFakeNews(false);
            setFakeNewsReason('');
            setMoreInfo('');

            console.log('Sending request to check fake news for video:', videoUrl);

            const response = await axios.post('http://localhost:10000/check-fake-news', 
                { videoUrl }, 
                { cancelToken: cancelTokenSource.current.token }
            );

            setIsFakeNews(response.data.isFakeNews);
            if (response.data.isFakeNews) {
                setFakeNewsReason(response.data.explanation);
                setMoreInfo(response.data.chatGptAnalysis);
            } else {
                setFakeNewsReason('No fake news detected.');
                setMoreInfo(response.data.summary);
            }

            if (response.data.moderateVideos && response.data.moderateVideos.length > 0) {
                const moderateVideoDetails = await fetchModerateVideos(response.data.moderateVideos);
                setModerateVideosState(moderateVideoDetails);
            }

        } catch (error) {
            if (axios.isCancel(error)) {
                console.log('Request canceled', error.message);
            } else {
                console.error('Error checking for fake news:', error);
                setFakeNewsReason('Error occurred while checking for fake news.');
                setMoreInfo('Error occurred while fetching more information.');
            }
        } finally {
            setLoading(false);
        }
    };

    const fetchModerateVideos = async (moderateVideos) => {
        const videoIds = moderateVideos.map(video => video.videoId).join(',');
        const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoIds}&key=${API_KEY}`;

        try {
            const res = await axios.get(url);
            if (res.data.items) {
                return res.data.items.map(item => ({
                    videoId: item.id,
                    title: item.snippet.title,
                    thumbnail: item.snippet.thumbnails.default.url,
                }));
            }
        } catch (error) {
            console.error('Error fetching moderate video details:', error);
            return [];
        }
    };

    const fetchVideoData = async () => {
        try {
            const videoDetails_url = `https://youtube.googleapis.com/youtube/v3/videos?part=snippet%2CcontentDetails%2Cstatistics&key=${API_KEY}&id=${videoId}`;
            console.log('Fetching video details from:', videoDetails_url);

            const res = await fetch(videoDetails_url);
            if (!res.ok) throw new Error('Failed to fetch video details');
            const data = await res.json();
            setApiData(data.items[0]);

            console.log('Video details fetched successfully:', data.items[0]);

            checkFakeNews(`https://www.youtube.com/watch?v=${videoId}`);
        } catch (error) {
            console.error('Error fetching video data:', error);
        }
    };

    const fetchOtherData = async () => {
        try {
            if (apiData) {
                const channelLogo_url = `https://youtube.googleapis.com/youtube/v3/channels?part=snippet%2CcontentDetails%2Cstatistics&id=${apiData.snippet.channelId}&key=${API_KEY}`;
                console.log('Fetching channel data from:', channelLogo_url);

                const res = await fetch(channelLogo_url);
                if (!res.ok) throw new Error('Failed to fetch channel data');
                const data = await res.json();
                setChannelData(data.items[0]);

                console.log('Channel data fetched successfully:', data.items[0]);

                const videoComment_url = `https://www.googleapis.com/youtube/v3/commentThreads?textFormat=plainText&part=snippet&maxResults=50&key=${API_KEY}&videoId=${videoId}`;
                console.log('Fetching comments from:', videoComment_url);

                const commentRes = await fetch(videoComment_url);
                if (!commentRes.ok) throw new Error('Failed to fetch comments');
                const commentData = await commentRes.json();
                setCommentData(commentData.items);

                console.log('Comments fetched successfully:', commentData.items);
            }
        } catch (error) {
            console.error('Error fetching other data:', error);
        }
    };

    useEffect(() => {
        setLoading(true);
        fetchVideoData();
        window.scrollTo(0, 0);
    }, [videoId]);

    useEffect(() => {
        fetchOtherData();
    }, [apiData]);

    useEffect(() => {
        return () => {
            if (cancelTokenSource.current) {
                cancelTokenSource.current.cancel("Component unmounted.");
            }
        };
    }, []);

    const handleMoreInfo = () => {
        setShowFullAnalysis(!showFullAnalysis); // Toggle full analysis display
    };

    const handleFlag = () => {
        if (isFakeNews) {
            alert(`Video flagged due to: ${fakeNewsReason}`);
        } else {
            alert(`Flagged: ${apiData.snippet.title}`);
        }
    };

    const handleModerationToggle = () => {
        setShowModerationVideos(!showModerationVideos);
    };

    return (
        <div className="play-video">
            <iframe src={`https://www.youtube.com/embed/${videoId}?&autoplay=1`} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen></iframe>

            <div className="fake-news-status">
                {loading ? (
                    <p>Fake news detection in progress...</p>
                ) : isFakeNews ? (
                    <p style={{ color: 'red' }}>{fakeNewsReason}</p>
                ) : (
                    <p style={{ color: 'green' }}>No Fake News Detected</p>
                )}
            </div>

            {apiData && (
                <>
                    <h3>{apiData.snippet.title}</h3>
                    <div className="play-video-info">
                        <p>{value_converter(apiData.statistics.viewCount)} Views  &bull; {moment(apiData.snippet.publishedAt).fromNow()}</p>
                        <div>
                            <span><img src={like} alt="" />{value_converter(apiData.statistics.likeCount)}</span>
                            <span><img src={dislike} alt="" />2</span>
                            <span><img src={share} alt="" />Share</span>
                            <span><img src={save} alt="" />Save</span>
                        </div>
                    </div>
                    <hr />
                    <div className="publisher">
                        <img src={channelData ? channelData.snippet.thumbnails.default.url : ""} alt="" />
                        <div>
                            <p>{apiData.snippet.channelTitle}</p>
                            <span>{channelData ? value_converter(channelData.statistics.subscriberCount) : "1M"} Subscribers</span>
                        </div>
                        <div className="action-buttons">
                            <button onClick={handleMoreInfo} className="more-info-button">More Information</button>
                            <button onClick={handleModerationToggle} className="moderation-button">
                                Moderation
                            </button>
                            {isFakeNews && (
                                <button onClick={handleFlag} className="flag-button">
                                    <img src={flagIcon} alt="Flag" />
                                </button>
                            )}
                        </div>
                    </div>
                    {showFullAnalysis && (
                        <div className="full-analysis">
                            <h4>More Information:</h4>
                            <p>{moreInfo}</p>
                        </div>
                    )}
                    {showModerationVideos && moderateVideos.length > 0 && (
                        <div className="moderate-videos">
                            {moderateVideos.map((video, index) => (
                                <a key={index} href={`https://www.youtube.com/watch?v=${video.videoId}`} target="_blank" rel="noopener noreferrer">
                                    <div className="moderate-video">
                                        <img src={video.thumbnail} alt={video.title} />
                                        <p>{video.title}</p>
                                    </div>
                                </a>
                            ))}
                        </div>
                    )}
                    <div className="vid-description">
                        <p>{apiData.snippet.description.slice(0, 250)}</p>
                        <hr />
                        <h4>{value_converter(apiData.statistics.commentCount)} Comments</h4>

                        {commentData.map((item, index) => (
                            <div key={index} className="comment">
                                <img src={item.snippet.topLevelComment.snippet.authorProfileImageUrl} alt="" />
                                <div>
                                    <h3>{item.snippet.topLevelComment.snippet.authorDisplayName} <span>{moment(item.snippet.topLevelComment.snippet.publishedAt).fromNow()}</span></h3>
                                    <p>{item.snippet.topLevelComment.snippet.textDisplay}</p>
                                    <div className="comment-action">
                                        <img src={like} alt="" />
                                        <span>{item.snippet.topLevelComment.snippet.likeCount}</span>
                                        <img src={dislike} alt="" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

export default PlayVideo;
