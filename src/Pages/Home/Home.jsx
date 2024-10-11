import React, { useState } from "react";
import Sidebar from "../../Components/Sidebar/Sidebar";
import Feed from "../../Components/Feed/Feed";
import { Link } from "react-router-dom";
import './Home.css';

const Home = ({ sidebar, searchResults }) => {
  const [category, setCategory] = useState(0);

  return (
    <>
      <Sidebar setCategory={setCategory} sidebar={sidebar} />
      <div className={`container ${sidebar ? "" : "large-container"}`}>
        {searchResults.length > 0 ? (
          <div className="search-results">
            {searchResults.map((video) => (
              <div key={video.id.videoId} className="video-item">
                <Link to={`/video/${category}/${video.id.videoId}`}>
                  <img src={video.snippet.thumbnails.medium.url} alt={video.snippet.title} />
                  <div className="video-title">{video.snippet.title}</div>
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <Feed category={category} />
        )}
      </div>
    </>
  );
};

export default Home;
