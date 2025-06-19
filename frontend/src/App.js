import React, { useState } from 'react';
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
      <header className="app-header">
        <h1>Project Registration</h1>
        <p>Register your project details with us</p>
      </header>
      
      <main className="container">
        {message.text && (
          <div className={`alert alert-${message.type}`}>
            {message.text}
          </div>
        )}
        <RegistrationForm onMessage={showMessage} />
      </main>
      
      <footer className="app-footer">
        <p>© {new Date().getFullYear()} Project Registration. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default App;
