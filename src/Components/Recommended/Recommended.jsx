import React, { useEffect, useState } from 'react';
import './Recommended.css';
import { API_KEY, value_converter } from '../../data';
import { Link } from 'react-router-dom';

const Recommended = ({ categoryId, moderateVideos }) => {
    const [moderateVideoDetails, setModerateVideoDetails] = useState([]);
    const [apiData, setApiData] = useState([]);
    const relatedVideo_API = `https://youtube.googleapis.com/youtube/v3/videos?part=snippet%2CcontentDetails%2Cstatistics&chart=mostPopular&maxResults=46&regionCode=US&videoCategoryId=${categoryId}&key=${API_KEY}`;

    useEffect(() => {
        fetch(relatedVideo_API)
            .then(res => res.json())
            .then(data => setApiData(data.items));
    }, [categoryId]);

    useEffect(() => {
        if (moderateVideos.length > 0) {
            const videoIds = moderateVideos.map(video => video.videoId).join(',');
            const videoDetails_API = `https://youtube.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoIds}&key=${API_KEY}`;
            
            fetch(videoDetails_API)
                .then(res => res.json())
                .then(data => setModerateVideoDetails(data.items));
        }
    }, [moderateVideos]);

    return (
        <div className="recommended">
            {/* Display moderate videos fetched from their IDs */}
            {moderateVideoDetails.length > 0 && (
                <div className="moderate-videos">
                    <h4>Moderate Videos:</h4>
                    {moderateVideoDetails.map((video, index) => (
                        <div key={index} className="side-video-list">
                            <Link to={`/video/${video.snippet.categoryId}/${video.id}`} onClick={() => window.scrollTo(0, 0)} className="small-thumbnail">
                                <img src={video.snippet.thumbnails.medium.url} alt="" />
                            </Link>
                            <div className="vid-info">
                                <h4>{video.snippet.title}</h4>
                                <p>{video.snippet.channelTitle}</p>
                                <p className='recommended-views'>{value_converter(video.statistics.viewCount)} Views</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            {/* Display regular recommended videos */}
            {apiData.map((item, index) => {
                return (
                    <div key={index} className="side-video-list">
                        <Link to={`/video/${item.snippet.categoryId}/${item.id}`} onClick={() => window.scrollTo(0, 0)} className="small-thumbnail">
                            <img src={item.snippet.thumbnails.medium.url} alt="" />
                        </Link>
                        <div className="vid-info">
                            <h4>{item.snippet.title}</h4>
                            <p>{item.snippet.channelTitle}</p>
                            <p className='recommended-views'>{value_converter(item.statistics.viewCount)} Views</p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default Recommended;
