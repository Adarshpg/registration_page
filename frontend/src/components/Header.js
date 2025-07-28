import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import './Header.css';

const Header = ({ isAuthenticated, onLogout }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    onLogout();
    navigate('/');
  };

  return (
    <header className="header">
      <div className="container">
        <div className="header-content">
          <div className="logo-container">
            <div 
              className="logo-link" 
              onClick={() => window.location.href = 'https://medinitechnologies.in/'}
              style={{ cursor: 'pointer' }}
            >
              <img 
                src="/images/123.png" 
                alt="Logo" 
                className="logo"
              />
              <span className="logo-text"></span>
            </div>
          </div>
          <nav className="nav">
            <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>
              Home
            </Link>
            {isAuthenticated && (
              <>
                <Link 
                  to="/registrations" 
                  className={`nav-link ${location.pathname === '/registrations' ? 'active' : ''}`}
                >
                  View Registrations
                </Link>
                <button 
                  onClick={handleLogout}
                  className="nav-link logout-btn"
                >
                  Logout
                </button>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
