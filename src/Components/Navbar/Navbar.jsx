import React, { useState } from 'react';
import './Navbar.css';
import { Link } from 'react-router-dom';
import menu_icon from '../../assets/menu.png';
import logo from '../../assets/logo.png';
import search_icon from '../../assets/search.png';
import upload_icon from '../../assets/upload.png';
import more_icon from '../../assets/more.png';
import notification_icon from '../../assets/notification.png';
import jack_img from '../../assets/jack.png';

const Navbar = ({ setSidebar, setSearchResults, onLogoClick, onSearchInitiated }) => {
    const [searchQuery, setSearchQuery] = useState('');

    const sidebar_toggle = () => {
        setSidebar((prev) => !prev);
    };

    const handleInputChange = (e) => {
        setSearchQuery(e.target.value);
    };

    const handleSearch = async () => {
        if (searchQuery.length) {
            const API_KEY = 'AIzaSyBe2x8I4dfMOn6Q2rhdNUQn_uQSCHv6Fpc';  
            const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=5&q=${searchQuery}&key=${API_KEY}`;

            try {
                const response = await fetch(searchUrl);
                const data = await response.json();
                setSearchResults(data.items);

                // Notify that a search has been initiated
                if (onSearchInitiated) {
                    onSearchInitiated();
                }

                // Clear the search input after the search is executed
                setSearchQuery('');
            } catch (error) {
                console.error("Error fetching search results", error);
            }
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    return (
        <nav className='flex-div'>
            <div className="nav-left flex-div">
                <img src={menu_icon} alt="Menu" className="menu-icon" onClick={sidebar_toggle} />
                <img src={logo} alt="Logo" className="logo" onClick={onLogoClick} />
            </div>
            <div className="nav-middle flex-div">
                <div className="search-box flex-div">
                    <input 
                        type="text" 
                        placeholder="Search" 
                        value={searchQuery}
                        onChange={handleInputChange}
                        onKeyPress={handleKeyPress}
                    />
                    <img 
                        src={search_icon} 
                        alt="Search" 
                        onClick={handleSearch}
                        className="search-icon"
                    />
                </div>
            </div>
            <div className="nav-right flex-div">
                <img src={upload_icon} alt="Upload" />
                <img src={more_icon} alt="More" />
                <img src={notification_icon} alt="Notifications" />
                <img src={jack_img} alt="User" className="user-icon" />
            </div>
        </nav>
    );
};

export default Navbar;
