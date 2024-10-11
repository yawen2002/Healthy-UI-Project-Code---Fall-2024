import React, { useState } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import Navbar from "./Components/Navbar/Navbar";
import Home from "./Pages/Home/Home";
import Video from "./Pages/Video/Video";

const App = () => {
  const [sidebar, setSidebar] = useState(true);
  const [searchResults, setSearchResults] = useState([]);
  const navigate = useNavigate();

  const handleLogoClick = () => {
    setSearchResults([]);  // Clear search results when going home
    navigate('/');
  };

  const handleClearSearchResults = () => {
    setSearchResults([]);  // Clear search results when navigating to other components
  };

  return (
    <div>
      <Navbar setSidebar={setSidebar} setSearchResults={setSearchResults} onLogoClick={handleLogoClick} />
      <Routes>
        <Route path="/" element={<Home sidebar={sidebar} searchResults={searchResults} onClearSearchResults={handleClearSearchResults} />} />
        <Route path="/video/:categoryId/:videoId" element={<Video onClearSearchResults={handleClearSearchResults} />} />
      </Routes>
    </div>
  );
};

export default App;
