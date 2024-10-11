import React, { useState } from "react";
import PlayVideo from "../../Components/PlayVideo/PlayVideo";
import Recommended from "../../Components/Recommended/Recommended";
import './Video.css';
import { useParams } from "react-router-dom";

const Video = () => {
  const { videoId, categoryId } = useParams();
  const [moderateVideos, setModerateVideos] = useState([]);

  return (
    <div className="play-container">
      <PlayVideo videoId={videoId} setModerateVideos={setModerateVideos} />
      <Recommended categoryId={categoryId} moderateVideos={moderateVideos} />
    </div>
  );
};

export default Video;
