import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import RegistrationForm from './components/RegistrationForm';
import './App.css';

function App() {
  const [message, setMessage] = useState({ text: '', type: '' });

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  };

  return (
    <div className="app">
      <Header />
      <main className="container">
        {message.text && (
          <div className={`alert alert-${message.type}`}>
            {message.text}
          </div>
        )}
        <Routes>
          <Route 
            path="/" 
            element={<RegistrationForm onMessage={showMessage} />} 
          />
          {/* Add more routes here as needed */}
        </Routes>
      </main>
      <footer className="app-footer">
        <p> {new Date().getFullYear()} Project Registration. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default App;
