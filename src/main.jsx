// Importing necessary modules from React and ReactDOM libraries
import React from 'react'
import ReactDOM from 'react-dom/client'

// Importing the main App component from a local file
import App from './App.jsx'

// Importing the global CSS file for styling the application
import './index.css'

// Importing BrowserRouter from react-router-dom for enabling routing in the application
import { BrowserRouter } from 'react-router-dom'

// Rendering the root component of the React application
ReactDOM.createRoot(document.getElementById('root')).render(
  // Wrapping the App component with React.StrictMode to highlight potential problems in an application
  <React.StrictMode>
    {/* Wrapping the App component with BrowserRouter to enable routing in the application */}
    <BrowserRouter>
      {/* Rendering the App component */}
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)

