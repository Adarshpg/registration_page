import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import './AdminDashboard.css';
import axios from 'axios';
import { FaEye, FaTrash, FaSyncAlt, FaSearch } from 'react-icons/fa';
import io from 'socket.io-client';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/registrations';

// Services and their respective courses - should match the RegistrationForm
const SERVICES = [
  { 
    id: 'edutech', 
    name: 'EduTech', 
    courses: ['Online Tutoring', 'E-Learning Platform', 'Educational Apps'] 
  },
  { 
    id: 'digidhvani', 
    name: 'DigiDhwani', 
    courses: ['Digital Marketing', 'Content Creation', 'Social Media Management'] 
  },
  { 
    id: 'builddspace', 
    name: 'BuilddSpace', 
    courses: ['Co-Working Space', 'Startup Incubation', 'Mentorship Programs'] 
  },
  { 
    id: 'eduphygital', 
    name: 'EduPhyGital', 
    courses: ['Blended Learning', 'Hybrid Education', 'Digital Classrooms'] 
  },
  { 
    id: 'mechsetu', 
    name: 'MechSetu', 
    courses: ['Mechanical Engineering', 'CAD/CAM Training', 'Industrial Automation'] 
  },
  { 
    id: 'nalaneel', 
    name: 'Nalaneel', 
    courses: ['Research & Development', 'Innovation Lab', 'Tech Incubation'] 
  },
  { 
    id: 'bim-construct', 
    name: 'BIM Construct', 
    courses: ['Building Information Modeling', 'Construction Management', 'Architectural Design'] 
  }
];

const AdminDashboard = () => {
    // State management
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
    const [services, setServices] = useState([]);
    const [serviceCourses, setServiceCourses] = useState({});
    
    // Refs
    const socketRef = useRef(null);

    // Format date for display
    const formatDate = useCallback((dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }, []);

    // Memoized fetch function to prevent unnecessary re-renders
    const fetchRegistrations = useCallback(async (page = 1, search = '', service = '') => {
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
            
            if (response.data?.success) {
                const registrationsData = response.data.data || [];
                const { total, totalPages, hasNextPage, hasPreviousPage } = response.data;
                
                if (!Array.isArray(registrationsData)) {
                    throw new Error('Invalid data format received from server');
                }
                
                // Process registrations
                const processedRegistrations = registrationsData.map(reg => ({
                    ...reg,
                    _id: reg._id || Date.now().toString(),
                    fullName: reg.fullName || 'Unknown',
                    email: reg.email || 'No email',
                    phone: reg.phone || 'No phone',
                    service: reg.service || 'General',
                    course: reg.course || 'Not specified',
                    qualification: reg.qualification || 'Not specified',
                    passingYear: reg.passingYear || 'N/A',
                    createdAt: reg.createdAt || new Date().toISOString()
                }));
                
                // Extract unique services and courses
                const servicesSet = new Set();
                const coursesMap = {};
                
                processedRegistrations.forEach(reg => {
                    if (reg.service) {
                        servicesSet.add(reg.service);
                        if (!coursesMap[reg.service]) {
                            coursesMap[reg.service] = new Set();
                        }
                        if (reg.course) {
                            coursesMap[reg.service].add(reg.course);
                        }
                    }
                });
                
                // Update state
                setRegistrations(processedRegistrations);
                setServices(Array.from(servicesSet).map(service => ({
                    id: service.toLowerCase().replace(/\s+/g, '-'),
                    name: service
                })));
                
                setServiceCourses(
                    Object.fromEntries(
                        Object.entries(coursesMap).map(([service, courses]) => [
                            service,
                            Array.from(courses)
                        ])
                    )
                );
                
                setPagination({
                    currentPage: page,
                    totalPages,
                    hasNextPage,
                    hasPreviousPage,
                    total
                });
            } else {
                throw new Error(response.data?.message || 'Failed to fetch registrations');
            }
        } catch (error) {
            console.error('Error fetching registrations:', error);
            setError(error.message || 'Failed to fetch registrations. Please try again later.');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [isRefreshing]);
    
    // Initialize WebSocket connection
    useEffect(() => {
        if (typeof window === 'undefined') return;

        // Request notification permission if not already granted
        if (Notification.permission !== 'denied') {
            Notification.requestPermission();
        }

        // Connect to WebSocket server with explicit configuration
        const socket = io(process.env.REACT_APP_WS_URL || 'http://localhost:5000', {
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
        
        // Handle new registration event
        const handleNewRegistration = (newRegistration) => {
            console.log('New registration received:', newRegistration);
            
            // Process the new registration
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
            
            // Update registrations state
            setRegistrations(prevRegistrations => {
                const exists = prevRegistrations.some(reg => 
                    reg._id === processedRegistration._id || 
                    (reg.email === processedRegistration.email && reg.email !== 'No email')
                );
                
                if (!exists) {
                    return [processedRegistration, ...prevRegistrations];
                }
                
                return prevRegistrations.map(reg => 
                    (reg._id === processedRegistration._id || 
                     (reg.email === processedRegistration.email && reg.email !== 'No email')) 
                        ? processedRegistration 
                        : reg
                );
            });
            
            // Show notification
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
            socket.emit('joinAdminRoom');
        });
        
        socket.on('disconnect', (reason) => {
            console.log('❌ Disconnected from WebSocket server:', reason);
        });
        
        socket.on('connect_error', (error) => {
            console.error('❌ WebSocket connection error:', error);
            setTimeout(() => socket.connect(), 5000);
        });
        
        // Listen for new registration events
        socket.on('newRegistration', handleNewRegistration);
        
        // Cleanup
        return () => {
            console.log('Cleaning up WebSocket connection...');
            socket.off('newRegistration', handleNewRegistration);
            socket.disconnect();
        };
    }, []);
    
    // Initial data fetch
    useEffect(() => {
        fetchRegistrations();
    }, [fetchRegistrations]);
    
    // Handle search input change
    const handleSearch = useCallback((e) => {
        const value = e.target.value;
        setSearchTerm(value);
        fetchRegistrations(1, value, selectedService);
    }, [fetchRegistrations, selectedService]);

    // Handle refresh button click
    const handleRefresh = useCallback(() => {
        setIsRefreshing(true);
        fetchRegistrations(pagination.currentPage, searchTerm, selectedService);
    }, [fetchRegistrations, pagination.currentPage, searchTerm, selectedService]);

    // Handle view student details
    const handleViewStudent = useCallback((student) => {
        const details = [
            `Name: ${student.fullName || 'N/A'}`,
            `Email: ${student.email || 'N/A'}`,
            `Phone: ${student.phone || 'N/A'}`,
            `Service: ${student.service || 'N/A'}`,
            `Course: ${student.course || 'N/A'}`,
            `Qualification: ${student.qualification || 'N/A'}`,
            `Year: ${student.passingYear || 'N/A'}`,
            `Registered: ${student.createdAt ? formatDate(student.createdAt) : 'N/A'}`
        ].join('\n');
        
        alert(details);
    }, [formatDate]);

    // Handle delete student
    const handleDeleteStudent = useCallback(async (id) => {
        if (window.confirm('Are you sure you want to delete this registration?')) {
            try {
                await axios.delete(`${API_URL}/${id}`);
                setRegistrations(prev => prev.filter(reg => reg._id !== id));
            } catch (err) {
                console.error('Error deleting registration:', err);
                alert('Failed to delete registration. Please try again.');
            }
        }
    }, []);
    
    // Get available courses for selected service
    const getAvailableCourses = useCallback((serviceName) => {
        if (!serviceName || serviceName === 'All') return [];
        const service = SERVICES.find(s => s.name === serviceName);
        return service ? service.courses : [];
    }, []);

    // Filter registrations based on search, service, and course
    const filteredRegistrations = useMemo(() => {
        return registrations.filter(reg => {
            if (!reg) return false;
            
            // Filter by search term
            const searchFields = [
                reg.fullName || '',
                reg.email || '',
                reg.phone || '',
                reg.qualification || '',
                reg.passingYear ? reg.passingYear.toString() : '',
                reg.service || '',
                reg.course || '',
                reg.message || ''
            ];
            
            const matchesSearch = searchTerm === '' || searchFields.some(
                field => field.toLowerCase().includes(searchTerm.toLowerCase())
            );
                
            // Filter by selected service
            const matchesService = selectedService === 'All' || reg.service === selectedService;
                
            return matchesSearch && matchesService;
        });
    }, [registrations, searchTerm, selectedService]);
    
    // Calculate service counts for sidebar
    const serviceCounts = useMemo(() => {
        const counts = { 'All': registrations.length };
        // Initialize all services with count 0
        SERVICES.forEach(service => {
            counts[service.name] = 0;
        });
        // Count actual registrations
        registrations.forEach(reg => {
            if (reg.service) {
                counts[reg.service] = (counts[reg.service] || 0) + 1;
            }
        });
        return counts;
    }, [registrations]);
    
    // Loading state
    if (isLoading) {
        return (
            <div className="admin-dashboard">
                <div className="loading">Loading registrations...</div>
            </div>
        );
    }
    
    // Error state
    if (error) {
        return (
            <div className="admin-dashboard">
                <div className="error">
                    <p>{error}</p>
                    <button onClick={() => fetchRegistrations()} className="refresh-btn">
                        <FaSyncAlt className={isRefreshing ? 'spinning' : ''} />
                        Try Again
                    </button>
                </div>
            </div>
        );
    }
    
    // Main render
    return (
        <div className="admin-dashboard">
            <header className="dashboard-header">
                <h1>Admin Dashboard</h1>
                <div className="header-actions">
                    <div className="search-box">
                        <FaSearch className="search-icon" />
                        <input
                            type="text"
                            placeholder="Search by name, email, phone, etc..."
                            value={searchTerm}
                            onChange={handleSearch}
                            className="search-input"
                        />
                        {searchTerm && (
                            <button 
                                className="clear-search"
                                onClick={() => setSearchTerm('')}
                                title="Clear search"
                            >
                                &times;
                            </button>
                        )}
                    </div>
                    <button 
                        onClick={handleRefresh} 
                        className="refresh-btn"
                        disabled={isRefreshing}
                    >
                        <FaSyncAlt className={isRefreshing ? 'spinning' : ''} />
                        {isRefreshing ? 'Refreshing...' : 'Refresh'}
                    </button>
                </div>
            </header>
            
            <div className="dashboard-container">
                <aside className="sidebar">
                    <h3>Services</h3>
                    <ul className="service-list">
                        <li 
                            className={selectedService === 'All' ? 'active' : ''}
                            onClick={() => setSelectedService('All')}
                        >
                            <span>All Services</span>
                            <span className="count">{serviceCounts['All'] || 0}</span>
                        </li>
                        {services.map(service => (
                            <li 
                                key={service.id}
                                className={selectedService === service.name ? 'active' : ''}
                                onClick={() => setSelectedService(service.name)}
                            >
                                <span>{service.name}</span>
                                <span className="count">{serviceCounts[service.name] || 0}</span>
                            </li>
                        ))}
                    </ul>
                </aside>
                
                <main className="main-content">
                    <div className="filters">
                        <div className="form-group">
                            <label htmlFor="service-filter">Service:</label>
                            <select 
                                id="service-filter" 
                                value={selectedService}
                                onChange={(e) => setSelectedService(e.target.value)}
                                className="filter-select"
                            >
                                <option value="All">All Services</option>
                                {SERVICES.map(service => (
                                    <option key={service.id} value={service.name}>
                                        {service.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        {selectedService !== 'All' && (
                            <div className="form-group">
                                <label htmlFor="course-filter">Course:</label>
                                <select 
                                    id="course-filter" 
                                    className="filter-select"
                                    disabled={!selectedService || selectedService === 'All'}
                                >
                                    <option value="">All Courses</option>
                                    {serviceCourses[selectedService]?.map((course, index) => (
                                        <option key={index} value={course}>
                                            {course}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                    
                    <div className="registrations-table-container">
                        {filteredRegistrations.length > 0 ? (
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
                                            <th>Registered</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredRegistrations.map(registration => (
                                            <tr key={registration._id}>
                                                <td>
                                                    <span className="truncate" title={registration.fullName}>
                                                        {registration.fullName}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className="truncate" title={registration.email}>
                                                        {registration.email}
                                                    </span>
                                                </td>
                                                <td>{registration.phone || 'N/A'}</td>
                                                <td>
                                                    <span className="truncate" title={registration.service}>
                                                        {registration.service || 'N/A'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className="truncate" title={registration.course}>
                                                        {registration.course || 'N/A'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className="truncate" title={registration.qualification}>
                                                        {registration.qualification || 'N/A'}
                                                    </span>
                                                </td>
                                                <td>{registration.passingYear || 'N/A'}</td>
                                                <td>{formatDate(registration.createdAt)}</td>
                                                <td className="actions">
                                                    <button 
                                                        className="btn-icon view"
                                                        onClick={() => handleViewStudent(registration)}
                                                        title="View Details"
                                                    >
                                                        <FaEye />
                                                    </button>
                                                    <button 
                                                        className="btn-icon delete"
                                                        onClick={() => handleDeleteStudent(registration._id)}
                                                        title="Delete Registration"
                                                    >
                                                        <FaTrash />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                
                                <div className="table-footer">
                                    <div className="pagination-info">
                                        Showing {filteredRegistrations.length} of {pagination.total} registrations
                                    </div>
                                    <div className="pagination">
                                        <button 
                                            onClick={() => fetchRegistrations(pagination.currentPage - 1, searchTerm, selectedService)}
                                            disabled={!pagination.hasPreviousPage}
                                        >
                                            Previous
                                        </button>
                                        <span>Page {pagination.currentPage} of {pagination.totalPages}</span>
                                        <button 
                                            onClick={() => fetchRegistrations(pagination.currentPage + 1, searchTerm, selectedService)}
                                            disabled={!pagination.hasNextPage}
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="no-results">
                                <p>No registrations found</p>
                                <button 
                                    onClick={() => {
                                        setSearchTerm('');
                                        setSelectedService('All');
                                        fetchRegistrations();
                                    }} 
                                    className="clear-filters"
                                >
                                    Clear Filters
                                </button>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default AdminDashboard;
