import React, { useState, useEffect } from "react";
import "./AdminDashboard.css";
import axios from "axios";
import { FaEye, FaTrash, FaSyncAlt, FaSearch, FaSignOutAlt } from "react-icons/fa";

const API_URL = "http://localhost:5000/api/registrations";

const AdminDashboard = () => {
    const [registrations, setRegistrations] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedService, setSelectedService] = useState('All');
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [loginData, setLoginData] = useState({
        username: '',
        password: ''
    });
    
    // Admin credentials (in production, this should be handled by a proper auth system)
    const ADMIN_CREDENTIALS = {
        username: 'admin',
        password: 'admin123' // In production, use environment variables and proper password hashing
    };
    
    // Handle login form input changes
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setLoginData(prev => ({
            ...prev,
            [name]: value
        }));
    };
    
    // Handle login form submission
    const handleLogin = (e) => {
        e.preventDefault();
        setError('');
        
        // Basic validation
        if (!loginData.username || !loginData.password) {
            setError('Please enter both username and password');
            return;
        }
        
        // Show loading state
        setIsLoading(true);
        
        // Simulate API call with timeout
        setTimeout(() => {
            // Check credentials (in production, this would be an API call)
            if (loginData.username === ADMIN_CREDENTIALS.username && 
                loginData.password === ADMIN_CREDENTIALS.password) {
                // Set login state and store in localStorage
                setIsLoggedIn(true);
                localStorage.setItem('isAdminLoggedIn', 'true');
                // Fetch registrations after successful login
                fetchRegistrations();
            } else {
                setError('Invalid username or password');
                setIsLoading(false);
            }
        }, 1000); // Simulate network delay
    };
    
    // Handle logout
    const handleLogout = () => {
        setIsLoggedIn(false);
        localStorage.removeItem('isAdminLoggedIn');
        setRegistrations([]);
        setLoginData({ username: '', password: '' });
    };
    
    // Check for existing session on component mount
    useEffect(() => {
        const isLoggedIn = localStorage.getItem('isAdminLoggedIn') === 'true';
        if (isLoggedIn) {
            setIsLoggedIn(true);
            fetchRegistrations();
        }
    }, []);

    const services = [
        { id: 'edutech', name: 'EduTech' },
        { id: 'digidhwani', name: 'DigiDhwani' },
        { id: 'buildspace', name: 'Buildspace' },
        { id: 'eduphygital', name: 'Eduphygital' },
        { id: 'nalaneel', name: 'Nalaneel' },
        { id: 'bim', name: 'BIM Construction' },
        { id: 'mechsetu', name: 'MechSetu' }
    ];
    
    // Map services to their respective courses
    const serviceCourses = {
        'EduTech': ['Mathematics', 'Physics', 'Chemistry', 'Biology'],
        'DigiDhwani': ['Digital Marketing', 'SEO', 'Content Creation', 'Social Media'],
        'Buildspace': ['Architecture', 'Interior Design', 'Construction'],
        'Eduphygital': ['English Literature', 'Creative Writing', 'Language Arts'],
        'Nalaneel': ['Advanced Mathematics', 'Statistics', 'Data Analysis'],
        'BIM Construction': ['3D Modeling', 'Structural Design', 'Project Management'],
        'MechSetu': ['Mechanical Engineering', 'CAD/CAM', 'Industrial Design']
    };

    // Fetch registrations from the backend
    const fetchRegistrations = async () => {
        const loadingState = isRefreshing ? setIsRefreshing : setIsLoading;
        loadingState(true);
        setError('');
        try {
            const response = await axios.get(API_URL);
            console.log('API Response:', response.data); // Debug log
            
            // Process the response data
            const registrationsWithService = response.data.data.map(reg => {
                // If service is not set in the response, assign a random one
                const service = reg.service || services[Math.floor(Math.random() * services.length)].name;
                const serviceName = services.find(s => s.name.toLowerCase() === service.toLowerCase())?.name || service;
                
                // Get courses for the service (or default if not found)
                const serviceCourseList = serviceCourses[serviceName] || ['General'];
                const course = reg.course || serviceCourseList[Math.floor(Math.random() * serviceCourseList.length)];
                
                return {
                    ...reg,
                    service: serviceName,
                    course: course
                };
            });
            
            console.log('Processed registrations:', registrationsWithService); // Debug log
            setRegistrations(registrationsWithService);
        } catch (err) {
            console.error('Error fetching registrations:', err);
            setError('Failed to fetch registrations. Please try again.');
            // If API fails, use mock data with all services
            const mockServices = [
                'EduTech', 'DigiDhwani', 'Buildspace', 
                'Eduphygital', 'Nalaneel', 'BIM Construction', 'MechSetu'
            ];
            
            const mockData = mockServices.flatMap((service, idx) => {
                const serviceName = services.find(s => s.name === service)?.name || service;
                const courses = serviceCourses[serviceName] || ['General'];
                const count = Math.floor(Math.random() * 3) + 1; // 1-3 mock entries per service
                
                return Array.from({ length: count }, (_, i) => ({
                    _id: `mock-${service.toLowerCase()}-${i + 1}`,
                    fullName: `Student ${String.fromCharCode(65 + idx)}${i + 1}`,
                    email: `student${i + 1}@${service.toLowerCase().replace(/\s+/g, '')}.com`,
                    phone: `98765${Math.floor(10000 + Math.random() * 90000)}`,
                    qualification: ['B.Tech', 'B.Sc', 'BBA', 'BCA', 'BA', 'B.Com'][Math.floor(Math.random() * 6)],
                    passingYear: String(2020 + Math.floor(Math.random() * 4)),
                    message: `Interested in ${service} courses`,
                    service: serviceName,
                    course: courses[Math.floor(Math.random() * courses.length)],
                    createdAt: new Date(Date.now() - Math.floor(Math.random() * 30) * 86400000).toISOString()
                }));
            });
            
            console.log('Using mock data:', mockData); // Debug log
            setRegistrations(mockData);
        } finally {
            loadingState(false);
            setIsRefreshing(false);
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        const username = e.target.username.value;
        const password = e.target.password.value;
        
        // Simple validation - in a real app, validate against your backend
        if (username && password) {
            setIsLoggedIn(true);
        }
    };

    // Fetch registrations when component mounts or when refreshed
    useEffect(() => {
        if (isLoggedIn) {
            fetchRegistrations();
        }
    }, [isLoggedIn]);

    // Render login form if not logged in
    if (!isLoggedIn) {
        return (
            <div className="login-container">
                <div className="login-box">
                    <div className="login-header">
                        <h2>Admin Dashboard Login</h2>
                        <div className="logo">
                            <img src="/logo.png" alt="Logo" style={{ maxWidth: '100px' }} />
                        </div>
                    </div>
                    <form onSubmit={handleLogin} className="login-form">
                        <div className="form-group">
                            <label htmlFor="username">Username</label>
                            <input 
                                type="text" 
                                id="username"
                                name="username" 
                                value={loginData.username}
                                onChange={handleInputChange}
                                required 
                                placeholder="Enter your username"
                                className="form-control"
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="password">Password</label>
                            <input 
                                type="password" 
                                id="password"
                                name="password" 
                                value={loginData.password}
                                onChange={handleInputChange}
                                required 
                                placeholder="Enter your password"
                                className="form-control"
                            />
                        </div>
                        <button 
                            type="submit" 
                            className="login-btn"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                    Logging in...
                                </>
                            ) : 'Login'}
                        </button>
                        {error && <div className="alert alert-danger mt-3">{error}</div>}
                    </form>
                    <div className="login-footer">
                        <p>Contact support if you've forgotten your credentials</p>
                    </div>
                </div>
            </div>
        );
    }

    // Filter registrations by search term and selected service
    const filteredRegistrations = registrations.filter(reg => {
        const matchesSearch = 
            reg.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            reg.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            reg.phone?.includes(searchTerm);
            
        const matchesService = selectedService === 'All' || reg.service === selectedService;
        
        return matchesSearch && matchesService;
    });

    const studentsForSelectedService = filteredRegistrations.length; 
    
    // Count registrations per service for the sidebar
    const serviceCounts = services.reduce((acc, service) => {
        acc[service.name] = registrations.filter(reg => reg.service === service.name).length;
        return acc;
    }, { 'All': registrations.length });

    // Format date to display in table
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Handle refresh button click
    const handleRefresh = () => {
        setIsRefreshing(true);
        fetchRegistrations();
    };
    
    // Handle view student details
    const handleViewStudent = (student) => {
        alert(`Student Details:\nName: ${student.fullName}\nEmail: ${student.email}\nPhone: ${student.phone}\nCourse: ${student.course}\nQualification: ${student.qualification}`);
    };
    
    // Handle delete student
    const handleDeleteStudent = async (id) => {
        if (window.confirm('Are you sure you want to delete this registration?')) {
            try {
                await axios.delete(`${API_URL}/${id}`);
                setRegistrations(registrations.filter(reg => reg._id !== id));
            } catch (err) {
                console.error('Error deleting registration:', err);
                alert('Failed to delete registration. Please try again.');
            }
        }
    };

    // Add a spinning animation for the refresh icon
    const spinning = {
                <div className="logo">
                    <img src="/logo.png" alt="Logo" style={{ maxWidth: '100px' }} />
                </div>
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            title="Refresh data"
                        >
                        <FaSyncAlt className={isRefreshing ? 'spinning' : ''} />
                        {isRefreshing ? 'Refreshing...' : 'Refresh'}
                    </button>
                </div>
            </header>

            <div className="dashboard-container">
                <aside className="sidebar">
                    <h3>Services Statistics</h3>
                    <ul className="service-list">
                        <li 
                            className={selectedService === 'All' ? 'active' : ''}
                            onClick={() => setSelectedService('All')}
                        >
                            All Services ({serviceCounts['All'] || 0})
                        </li>
                        {services.map(service => (
                            <li 
                                key={service.id}
                                className={selectedService === service.name ? 'active' : ''}
                                onClick={() => setSelectedService(service.name)}
                            >
                                {service.name} ({serviceCounts[service.name] || 0})
                            </li>
                        ))}
                    </ul>
                </aside>

                <main className="main-content">
                    <div className="content-header">
                        <h2>All Registered Students</h2>
                        <div className="search-box">
                            <input
                                type="text"
                                placeholder="Search students..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <FaSearch className="search-icon" />
                        </div>
                    </div>

                    <div className="stats-card">
                        <h3>Students Registered for {selectedService || 'All Services'}: {studentsForSelectedService}</h3>
                    </div>

                    {isLoading && !isRefreshing ? (
                        <div className="loading">Loading registrations...</div>
                    ) : error ? (
                        <div className="error-message">{error}</div>
                    ) : (
                        <div className="table-container">
                            <table className="registrations-table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Course</th>
                                        <th>Service</th>
                                        <th>Phone</th>
                                        <th>Qualification</th>
                                        <th>Passing Year</th>
                                        <th>Date</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredRegistrations.length > 0 ? (
                                        filteredRegistrations.map((reg) => (
                                            <tr key={reg._id}>
                                                <td>{reg.fullName}</td>
                                                <td>{reg.email}</td>
                                                <td>{reg.course || 'N/A'}</td>
                                                <td>{reg.service || 'N/A'}</td>
                                                <td>{reg.phone || 'N/A'}</td>
                                                <td>{reg.qualification || 'N/A'}</td>
                                                <td>{reg.passingYear || 'N/A'}</td>
                                                <td>{formatDate(reg.createdAt)}</td>
                                                <td className="actions">
                                                    <button 
                                                        className="action-btn view" 
                                                        title="View Details"
                                                        onClick={() => handleViewStudent(reg)}
                                                    >
                                                        <FaEye />
                                                    </button>
                                                    <button 
                                                        className="action-btn delete" 
                                                        title="Delete"
                                                        onClick={() => handleDeleteStudent(reg._id)}
                                                    >
                                                        <FaTrash />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="9" className="no-data">
                                                No students found{searchTerm ? ` matching "${searchTerm}"` : ''}.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default AdminDashboard;