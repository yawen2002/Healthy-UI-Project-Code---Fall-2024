import React, { useEffect, useState } from 'react';
import './Feed.css';
import { Link } from 'react-router-dom';
import { API_KEY, value_converter } from '../../data';
import moment from 'moment';

const Feed = ({ category }) => {
  const [data, setData] = useState([]);

  const fetchData = async () => {
    const videoList_url = `https://youtube.googleapis.com/youtube/v3/videos?part=snippet%2CcontentDetails%2Cstatistics&chart=mostPopular&maxResults=50&regionCode=US&videoCategoryId=${category}&key=${API_KEY}`;
    await fetch(videoList_url)
      .then((response) => response.json())
      .then((data) => setData(data.items));
  };

  useEffect(() => {
    fetchData();
  }, [category]);

  const handleMoreInfo = (item) => {
    alert(`More info about: ${item.snippet.title}`);
  };

  const handleFlag = (item) => {
    alert(`Flagged: ${item.snippet.title}`);
  };

  return (
    <div className='feed'>
      {data.map((item, index) => (
        <div key={index} className="card">
          <Link to={`video/${item.snippet.categoryId}/${item.id}`}>
            <img src={item.snippet.thumbnails.medium.url} alt={item.snippet.title} />
            <h2>{item.snippet.title}</h2>
            <h3>{item.snippet.channelTitle}</h3>
            <p>
              {value_converter(item.statistics.viewCount)} Views &bull;
              {" " + moment(item.snippet.publishedAt).fromNow()}
            </p>
          </Link>
         
        </div>
      ))}
    </div>
  );
};

export default Feed;

