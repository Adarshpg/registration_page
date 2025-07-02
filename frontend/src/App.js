import React, { useState, createContext, useContext } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Header from './components/Header';
import RegistrationForm from './components/RegistrationForm';
import AdminDashboard from './components/AdminDashboard';
import './App.css';

// Create Auth Context
export const AuthContext = createContext(null);

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useContext(AuthContext);
  const location = useLocation();

  if (!isAuthenticated) {
    // Redirect to login page and save the current location
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

// Login Page Component
const LoginPage = () => {
  const { login } = useContext(AuthContext);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    
    if (login(username, password)) {
      // Redirect to the previous page or home
      navigate(from, { replace: true });
    } else {
      setError('Invalid username or password');
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-box">
          <div className="login-header">
            <h2>Admin Login</h2>
            <p>Please sign in to access the dashboard</p>
          </div>
          {error && <div className="alert alert-danger">{error}</div>}
          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="Enter username"
                className="form-control"
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter password"
                className="form-control"
              />
            </div>
            <button type="submit" className="btn btn-primary">
              Sign In
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

function App() {
  const [message, setMessage] = useState({ text: '', type: '' });
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  };

  const login = (username, password) => {
    // Fixed credentials for demo purposes
    if (username === 'admin' && password === 'admin@123') {
      setIsAuthenticated(true);
      localStorage.setItem('isAuthenticated', 'true');
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('isAuthenticated');
  };

  // Check if user is already authenticated on initial load
  React.useEffect(() => {
    const authStatus = localStorage.getItem('isAuthenticated') === 'true';
    setIsAuthenticated(authStatus);
  }, []);
  
  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      <div className="app">
        <Header isAuthenticated={isAuthenticated} onLogout={logout} />
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
            <Route path="/login" element={<LoginPage />} />
            <Route 
              path="/registrations" 
              element={
                <ProtectedRoute>
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/dashboard" 
              element={
                isAuthenticated ? (
                  <Navigate to="/registrations" replace />
                ) : (
                  <Navigate to="/login" state={{ from: '/registrations' }} replace />
                )
              } 
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <footer className="app-footer">
          <p> {new Date().getFullYear()} Project Registration. All rights reserved.</p>
        </footer>
      </div>
    </AuthContext.Provider>
  );
}

export default App;
