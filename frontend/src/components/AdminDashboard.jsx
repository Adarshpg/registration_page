import React, { useState, useEffect, useRef } from "react";
import "./AdminDashboard.css";
import axios from "axios";
import { FaEye, FaTrash, FaSyncAlt, FaSearch } from "react-icons/fa";
import io from 'socket.io-client';

const API_URL = 'http://localhost:5000/api/registrations';

// Fixed admin credentials
const ADMIN_CREDENTIALS = {
    username: 'admin',
    password: 'admin@123' // In a real app, use proper authentication with hashed passwords
};

const AdminDashboard = () => {
    const [registrations, setRegistrations] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedService, setSelectedService] = useState('All');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [pagination, setPagination] = useState({
        currentPage: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
        total: 0
    });
    const socketRef = useRef(null);

    const [services, setServices] = useState([]);
    const [serviceCourses, setServiceCourses] = useState({});

    // Fetch registrations from the server with pagination and filtering
    const fetchRegistrations = async (page = 1, search = '', service = '') => {
        console.log('Fetching registrations...', { page, search, service });
        const loadingState = isRefreshing ? setIsRefreshing : setIsLoading;
        loadingState(true);
        setError('');
        
        try {
            // Build query parameters
            const params = new URLSearchParams();
            params.append('page', page);
            if (search) params.append('search', search);
            if (service && service !== 'All') params.append('service', service);
            
            const response = await axios.get(`${API_URL}?${params.toString()}`);
            console.log('API Response:', response.data);
            
            if (response.data && response.data.success) {
                // Process the response data
                const registrationsData = response.data.data || [];
                const { total, totalPages, hasNextPage, hasPreviousPage } = response.data;
                
                console.log('Raw registrations data:', registrationsData);
                
                if (!Array.isArray(registrationsData)) {
                    throw new Error('Invalid data format received from server');
                }
                
                // Extract unique services from all registrations (not just current page)
                // We'll get this from the server in a real app, but for now, we'll use the current page
                const uniqueServices = ['All', ...new Set(registrationsData
                    .map(reg => reg && reg.service)
                    .filter(Boolean)
                )];
                
                console.log('Unique services:', uniqueServices);
                
                // Create services array with id and name
                const servicesList = uniqueServices.map((service) => ({
                    id: service === 'All' ? 'all' : service.toLowerCase().replace(/\s+/g, '-'),
                    name: service
                }));
                
                // Create service courses mapping
                const coursesMap = {};
                registrationsData.forEach(reg => {
                    if (reg && reg.service && reg.course) {
                        if (!coursesMap[reg.service]) {
                            coursesMap[reg.service] = new Set();
                        }
                        coursesMap[reg.service].add(reg.course);
                    }
                });
                
                // Convert Sets to Arrays
                Object.keys(coursesMap).forEach(service => {
                    coursesMap[service] = Array.from(coursesMap[service]);
                });
                
                console.log('Courses map:', coursesMap);
                
                setServices(servicesList);
                setServiceCourses(coursesMap);
                
                // Update pagination state
                setPagination({
                    currentPage: page,
                    totalPages,
                    hasNextPage,
                    hasPreviousPage,
                    total: response.data.total || 0
                });
                
                // Process registrations
                const processedRegistrations = registrationsData
                    .filter(reg => reg) // Filter out any null/undefined entries
                    .map(reg => ({
                        ...reg,
                        _id: reg._id || Date.now().toString(),
                        fullName: reg.fullName || 'Unknown',
                        email: reg.email || 'No email',
                        phone: reg.phone || 'No phone',
                        service: reg.service || 'General',
                        course: reg.course || 'Not specified',
                        qualification: reg.qualification || 'Not specified',
                        passingYear: reg.passingYear || 'N/A',
                        createdAt: reg.createdAt ? new Date(reg.createdAt).toISOString() : new Date().toISOString()
                    }));
                
                console.log('Processed registrations:', processedRegistrations);
                setRegistrations(processedRegistrations);
            } else {
                console.error('Invalid response format:', response.data);
                setError('Invalid data received from server');
            }
        } catch (error) {
            console.error('Error fetching registrations:', error);
            setError('Failed to fetch registrations. Please try again later.');
        } finally {
            loadingState(false);
            setIsRefreshing(false);
        }
    };

    // Fetch registrations on component mount
    useEffect(() => {
        fetchRegistrations();
        
        // Cleanup function
        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, []);
    
    // Initialize WebSocket connection
    useEffect(() => {
        // Only initialize in browser environment
        if (typeof window === 'undefined') {
            return () => {};
        }

        // Request notification permission if not already granted
        if (Notification.permission !== 'denied') {
            Notification.requestPermission();
        }

        // Connect to WebSocket server with explicit configuration
        const socket = io('http://localhost:5000', {
            withCredentials: true,
            path: '/socket.io/',
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 20000
        });
        
        socketRef.current = socket;
        
        // Debug logging
        console.log('Initializing WebSocket connection...');
        
        // Handle new registration event
        const handleNewRegistration = (newRegistration) => {
            console.log('New registration received:', newRegistration);
            
            // Process the new registration to match our data structure
            const processedRegistration = {
                ...newRegistration,
                _id: newRegistration._id || Date.now().toString(),
                fullName: newRegistration.fullName || 'Unknown',
                email: newRegistration.email || 'No email',
                phone: newRegistration.phone || 'No phone',
                service: newRegistration.service || 'General',
                course: newRegistration.course || 'Not specified',
                qualification: newRegistration.qualification || 'Not specified',
                passingYear: newRegistration.passingYear || 'N/A',
                createdAt: newRegistration.createdAt || new Date().toISOString()
            };
            
            // Update registrations state if not already present
            setRegistrations(prevRegistrations => {
                const exists = prevRegistrations.some(reg => 
                    reg._id === processedRegistration._id || 
                    (reg.email === processedRegistration.email && reg.email !== 'No email')
                );
                
                if (!exists) {
                    return [processedRegistration, ...prevRegistrations];
                }
                
                // If it exists, update it
                return prevRegistrations.map(reg => 
                    (reg._id === processedRegistration._id || 
                     (reg.email === processedRegistration.email && reg.email !== 'No email')) 
                        ? processedRegistration 
                        : reg
                );
            });
            
            // Update services list if needed
            setServices(prevServices => {
                const serviceName = processedRegistration.service || 'General';
                const serviceExists = prevServices.some(s => s.name === serviceName);
                
                if (!serviceExists) {
                    return [
                        ...prevServices,
                        {
                            id: serviceName.toLowerCase().replace(/\s+/g, '-'),
                            name: serviceName
                        }
                    ];
                }
                return prevServices;
            });
            
            // Update courses mapping if needed
            setServiceCourses(prevCourses => {
                const serviceName = processedRegistration.service || 'General';
                const courseName = processedRegistration.course || 'Not specified';
                
                const updatedCourses = { ...prevCourses };
                
                if (!updatedCourses[serviceName]) {
                    updatedCourses[serviceName] = [];
                }
                
                if (!updatedCourses[serviceName].includes(courseName)) {
                    updatedCourses[serviceName] = [...updatedCourses[serviceName], courseName];
                }
                
                return updatedCourses;
            });
            
            // Show a notification to the user
            if (Notification.permission === 'granted') {
                new Notification('New Registration', {
                    body: `${processedRegistration.fullName} registered for ${processedRegistration.course}`,
                    icon: '/logo192.png'
                });
            }
        };
        
        // Set up event listeners
        socket.on('connect', () => {
            console.log('✅ Connected to WebSocket server');
            // Join a room for admin updates
            socket.emit('joinAdminRoom');
        });
        
        socket.on('disconnect', (reason) => {
            console.log('❌ Disconnected from WebSocket server:', reason);
        });
        
        socket.on('connect_error', (error) => {
            console.error('❌ WebSocket connection error:', error);
            // Attempt to reconnect after a delay
            setTimeout(() => {
                console.log('Attempting to reconnect WebSocket...');
                socket.connect();
            }, 5000);
        });
        
        // Listen for new registration events
        socket.on('newRegistration', handleNewRegistration);
        
        // Cleanup function
        return () => {
            console.log('Cleaning up WebSocket connection...');
            socket.off('newRegistration', handleNewRegistration);
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
        };
    }, []);

    // Filter registrations by search term and selected service
    const filteredRegistrations = registrations.filter((reg) => {
        if (!reg) return false;
        
        // Filter by search term
        const searchFields = [
            reg.fullName || '',
            reg.email || '',
            reg.phone || '',
            reg.qualification || '',
            reg.passingYear || '',
            reg.service || '',
            reg.course || '',
        ];
        
        const matchesSearch = searchFields.some(
            field => field.toLowerCase().includes(searchTerm.toLowerCase())
        ) || searchTerm === '';
            
        // Filter by selected service
        const matchesService = selectedService === 'All' || 
            reg.service === selectedService;
            
        return matchesSearch && matchesService;
    });
    
    // Get all unique services from registrations for the filter dropdown
    const allServices = ['All', ...new Set(registrations.map(reg => reg.service).filter(Boolean))];

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

    // Handle search input change
    const handleSearch = (e) => {
        const searchValue = e.target.value;
        setSearchTerm(searchValue);
        // Reset to first page when searching
        fetchRegistrations(1, searchValue, selectedService);
    };

    // Handle service filter change
    const handleServiceChange = (e) => {
        const serviceValue = e.target.value;
        setSelectedService(serviceValue);
        // Reset to first page when changing service filter
        fetchRegistrations(1, searchTerm, serviceValue);
    };

    // Handle refresh button click
    const handleRefresh = () => {
        setIsRefreshing(true);
        fetchRegistrations(1, searchTerm, selectedService);
    };
    
    // Handle view student details
    const handleViewStudent = (student) => {
        // Format the student details for display
        const details = [
            `Name: ${student.fullName || 'N/A'}`,
            `Email: ${student.email || 'N/A'}`,
            `Phone: ${student.phone || 'N/A'}`,
            `Service: ${student.service || 'N/A'}`,
            `Course: ${student.course || 'N/A'}`,
            `Qualification: ${student.qualification || 'N/A'}`,
            `Year: ${student.passingYear || 'N/A'}`,
            `Registered: ${student.createdAt ? new Date(student.createdAt).toLocaleString() : 'N/A'}`
        ].join('\n');
        
        alert(details);
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
        animation: 'spin 1s linear infinite',
        '@keyframes spin': {
            '0%': { transform: 'rotate(0deg)' },
            '100%': { transform: 'rotate(360deg)' }
        }
    };

    return (
        <div className="admin-dashboard">
            <header className="dashboard-header">
                <div className="registrations-count">
                    Showing {filteredRegistrations.length} of {registrations.length} total registrations
                    {selectedService !== 'All' && ` (Filtered by: ${selectedService})`}
                </div>
                <div className="header-actions">
                    <button 
                        className="refresh-btn" 
                        onClick={handleRefresh}
                        disabled={isRefreshing}
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
                    <div className="filters">
                        <div className="search-box">
                            <FaSearch className="search-icon" />
                            <input
                                type="text"
                                placeholder="Search in all fields..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <select 
                            value={selectedService}
                            onChange={(e) => setSelectedService(e.target.value)}
                            className="service-filter"
                        >
                            {allServices.map((service, index) => (
                                <option key={index} value={service}>
                                    {service}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="stats-card">
                        <h3>Students Registered for {selectedService || 'All Services'}: {studentsForSelectedService}</h3>
                    </div>

                    <div className="registrations-table-container">
                        <div className="table-responsive">
                            <table className="registrations-table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Phone</th>
                                        <th>Service</th>
                                        <th>Course</th>
                                        <th>Qualification</th>
                                        <th>Year</th>
                                        <th>Date</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {isLoading ? (
                                        <tr>
                                            <td colSpan="9" className="loading-cell">
                                                <div className="spinner"></div>
                                                <span>Loading registrations...</span>
                                            </td>
                                        </tr>
                                    ) : error ? (
                                        <tr>
                                            <td colSpan="9" className="error-cell">
                                                {error}
                                            </td>
                                        </tr>
                                    ) : filteredRegistrations.length === 0 ? (
                                        <tr>
                                            <td colSpan="9" className="no-data">
                                                No registrations found
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredRegistrations.map(registration => (
                                            <tr key={registration._id} className="registration-row">
                                                <td>
                                                    <div className="student-name">
                                                        {registration.fullName}
                                                        <span className="service-badge">
                                                            {registration.service || 'General'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td>{registration.email || 'N/A'}</td>
                                                <td>{registration.phone || 'N/A'}</td>
                                                <td className="service-cell">
                                                    {registration.service || 'N/A'}
                                                </td>
                                                <td>{registration.course || 'N/A'}</td>
                                                <td>{registration.qualification || 'N/A'}</td>
                                                <td>{registration.passingYear || 'N/A'}</td>
                                                <td>{new Date(registration.createdAt).toLocaleDateString()}</td>
                                                <td className="actions">
                                                    <button 
                                                        onClick={() => handleViewStudent(registration)}
                                                        className="btn-view"
                                                        title="View Details"
                                                    >
                                                        <FaEye />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDeleteStudent(registration._id)}
                                                        className="btn-delete"
                                                        title="Delete"
                                                    >
                                                        <FaTrash />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="table-footer">
                            <div className="pagination-info">
                                Showing {filteredRegistrations.length} of {registrations.length} registrations
                            </div>
                            <div className="last-updated">
                                Last updated: {new Date().toLocaleTimeString()}
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default AdminDashboard;