import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import axios from 'axios';
import './index.css';

// Set base URL for API requests
axios.defaults.baseURL = process.env.REACT_APP_API_URL;

const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
