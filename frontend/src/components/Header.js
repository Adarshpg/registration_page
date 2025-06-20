import React from 'react';
import { Link } from 'react-router-dom';
import './Header.css';

const mediniLogo = '/images/medini.jpg';

const Header = () => {
  return (
    <header className="header">
      <div className="container">
        <div className="header-content">
          <div className="logo-container">
            <Link to="/" className="logo-link">
              <img 
                src={mediniLogo} 
                alt="Medini Logo" 
                className="logo"
              />
              <span className="logo-text">Medini</span>
            </Link>
          </div>
          <nav className="nav">
            <Link to="/" className="nav-link">Home</Link>
            <Link to="/registrations" className="nav-link">Registrations</Link>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
