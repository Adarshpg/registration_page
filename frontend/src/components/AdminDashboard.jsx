import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import './AdminDashboard.css';
import axios from 'axios';
import { FaEye, FaTrash, FaSyncAlt, FaFileAlt } from 'react-icons/fa';
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
    courses: ['Startup Incubation', 'Startup support'] 
  },
  { 
    id: 'eduphygital', 
    name: 'EduPhyGital', 
    courses: ['centre of excellence', 'Hybrid Education', 'centre of expertise'] 
  },
  { 
    id: 'mechsetu', 
    name: 'MechSetu', 
    courses: ['Mechanical Engineering', 'CAD/CAM Training', 'Industrial Automation'] 
  },
  { 
    id: 'nalaneel', 
    name: 'Nalaneel', 
    courses: ['Custom Software Development', 'Web Development', 'Mobile App Development', 'Cloud Solutions'] 
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
            // Ensure we have a valid API URL
            if (!API_URL) {
                throw new Error('API URL is not configured');
            }
            
            console.log('Making API request to:', API_URL, { page, search, service });
            
            const response = await axios.get(API_URL, {
                params: {
                    page,
                    ...(search && { search }),
                    ...(service && service !== 'All' && { service })
                },
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                withCredentials: true,
                timeout: 10000 // 10 second timeout
            });
            
            console.log('API Response Status:', response.status);
            console.log('API Response Data:', response.data);
            
            if (!response.data) {
                throw new Error('No data received from server');
            }
            
            // Handle both response formats: direct array or success/data wrapper
            const responseData = response.data;
            let registrationsData = [];
            let paginationData = {};
            
            if (Array.isArray(responseData)) {
                // Direct array response
                registrationsData = responseData;
                paginationData = {
                    total: registrationsData.length,
                    totalPages: 1,
                    currentPage: 1,
                    hasNextPage: false,
                    hasPreviousPage: false
                };
            } else if (responseData && Array.isArray(responseData.data)) {
                // Wrapped response with success/data
                registrationsData = responseData.data || [];
                paginationData = {
                    total: responseData.total || registrationsData.length,
                    totalPages: responseData.totalPages || 1,
                    currentPage: responseData.currentPage || 1,
                    hasNextPage: responseData.hasNextPage || false,
                    hasPreviousPage: responseData.hasPreviousPage || false
                };
            } else {
                throw new Error('Invalid response format from server');
            }
            
            if (!Array.isArray(registrationsData)) {
                console.error('Invalid data format received:', registrationsData);
                registrationsData = [];
            }
            
            // Process registrations with better error handling
            const processedRegistrations = registrationsData.map(reg => {
                try {
                    return {
                        _id: reg._id || `temp-${Math.random().toString(36).substr(2, 9)}`,
                        fullName: reg.fullName || 'Not provided',
                        email: reg.email || 'Not provided',
                        phone: reg.phone || 'Not provided',
                        service: reg.service || 'Not specified',
                        course: reg.course || 'Not specified',
                        qualification: reg.qualification || 'Not specified',
                        passingYear: reg.passingYear || 'N/A',
                        message: reg.message || '',
                        createdAt: reg.createdAt || new Date().toISOString(),
                        updatedAt: reg.updatedAt || new Date().toISOString()
                    };
                } catch (err) {
                    console.error('Error processing registration:', reg, err);
                    return null;
                }
            }).filter(Boolean); // Remove any null entries from failed processing
            
            // Extract unique services and courses
            const servicesSet = new Set();
            const coursesMap = {};
            
            processedRegistrations.forEach(reg => {
                if (reg && reg.service) {
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
            
            // Add predefined services if none found in the data
            const allServices = new Set([...SERVICES.map(s => s.name), ...servicesSet]);
            

            
            setPagination({
                currentPage: paginationData.currentPage,
                totalPages: paginationData.totalPages,
                hasNextPage: paginationData.hasNextPage,
                hasPreviousPage: paginationData.hasPreviousPage,
                total: paginationData.total
            });
            
            return responseData;
        } catch (error) {
            console.error('Error in fetchRegistrations:', error);
            setError(error.message || 'Failed to fetch registrations. Please try again.');
            return { data: [], total: 0, totalPages: 0 };
        } finally {
            loadingState(false);
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
        const loadData = async () => {
            try {
                console.log('Fetching initial data...');
                await fetchRegistrations(1, '', 'All');
            } catch (error) {
                console.error('Error in initial data fetch:', error);
                setError('Failed to load registration data. Please refresh the page to try again.');
            }
        };

        loadData();
    }, [fetchRegistrations]);
    
    // Handle search input change
    const handleSearch = useCallback(
        (e) => {
            const searchText = e.target.value;
            setSearchTerm(searchText);
            fetchRegistrations(1, searchText, selectedService).catch(error => {
                console.error('Error during search:', error);
                setError('Failed to perform search. Please try again.');
            });
        },
        [fetchRegistrations, selectedService]
    );

    // Handle refresh button click
    const handleRefresh = useCallback(() => {
        setIsRefreshing(true);
        fetchRegistrations(pagination.currentPage, searchTerm, selectedService).catch(error => {
            console.error('Error refreshing data:', error);
            setError('Failed to refresh data. Please try again.');
        });
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

    // Handle delete registration
    const handleDelete = useCallback(async (id) => {
        if (window.confirm('Are you sure you want to delete this registration? This action cannot be undone.')) {
            try {
                setIsLoading(true);
                await axios.delete(`${API_URL}/${id}`, {
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    withCredentials: true,
                    timeout: 10000 // 10 second timeout
                });
                
                // Show success message
                alert('Registration deleted successfully!');
                
                // Refresh the data after successful deletion
                await fetchRegistrations(pagination.currentPage, searchTerm, selectedService);
            } catch (error) {
                console.error('Error deleting registration:', error);
                const errorMessage = error.response?.data?.message || 
                                   'Failed to delete registration. Please try again.';
                setError(errorMessage);
                
                // If the error is due to the registration not being found, refresh the list
                if (error.response?.status === 404) {
                    await fetchRegistrations(pagination.currentPage, searchTerm, selectedService);
                }
            } finally {
                setIsLoading(false);
            }
        }
    }, [fetchRegistrations, pagination.currentPage, searchTerm, selectedService]);

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

    return (
        <div className="admin-dashboard">
            <header className="dashboard-header">
                <h1>Admin Dashboard</h1>
                <div className="header-actions">
                    <div className="search-and-refresh-container">
                        <div className="search-box">

                            <input
                                type="text"
                                placeholder="Search by name, email, phone, etc..."
                                value={searchTerm}
                                onChange={handleSearch}
                                className="search-input"
                                aria-label="Search registrations"
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
                            className={`refresh-btn ${isRefreshing ? 'refreshing' : ''}`}
                            disabled={isRefreshing}
                            title="Refresh data"
                        >
                            <FaSyncAlt className={isRefreshing ? 'spin' : ''} />
                            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
                        </button>
                    </div>
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
                        {SERVICES.map(service => (
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

                    </div>
                    
                    <div className="registrations-table-container">
                        {filteredRegistrations.length > 0 ? (
                            <div className="table-responsive">
                                <table className="registrations-table">
                                    <thead>
                                        <tr>
                                            <th className="name-col">Name</th>
                                            <th className="email-col">Email</th>
                                            <th className="phone-col">Phone</th>
                                            <th className="service-col">Service</th>

                                            <th className="qualification-col">Qualification</th>
                                            <th className="year-col">Passing Year</th>
                                            <th className="date-col">Date Registered</th>
                                            <th className="actions-col">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredRegistrations.map(registration => {
                                            if (!registration) return null;
                                            
                                            return (
                                                <tr key={registration._id} className="registration-row">
                                                    <td className="name-col">
                                                        <div className="cell-content" title={registration.fullName}>
                                                            {registration.fullName}
                                                        </div>
                                                    </td>
                                                    <td className="email-col">
                                                        <div className="cell-content" title={registration.email}>
                                                            <a href={`mailto:${registration.email}`} className="email-link">
                                                                {registration.email}
                                                            </a>
                                                        </div>
                                                    </td>
                                                    <td className="phone-col">
                                                        <div className="cell-content">
                                                            {registration.phone}
                                                        </div>
                                                    </td>
                                                    <td className="service-col">
                                                        <div className="cell-content" title={registration.service}>
                                                            {registration.service}
                                                        </div>
                                                    </td>

                                                    <td className="qualification-col">
                                                        <div className="cell-content" title={registration.qualification}>
                                                            {registration.qualification}
                                                        </div>
                                                    </td>
                                                    <td className="year-col">
                                                        <div className="cell-content">
                                                            {registration.passingYear}
                                                        </div>
                                                    </td>
                                                    <td className="date-col">
                                                        <div className="cell-content" title={formatDate(registration.createdAt)}>
                                                            <div className="date">
                                                                {new Date(registration.createdAt).toLocaleDateString()}
                                                            </div>
                                                            <div className="time">
                                                                {new Date(registration.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="actions-col">
                                                        <div className="actions-container">
                                                            <button 
                                                                className="btn-icon view"
                                                                onClick={() => handleViewStudent(registration)}
                                                                title="View Details"
                                                            >
                                                                <FaEye />
                                                            </button>
                                                            <button 
                                                                className="btn-icon delete"
                                                                onClick={() => handleDelete(registration._id)}
                                                                title="Delete Registration"
                                                                disabled={isLoading}
                                                            >
                                                                {isLoading ? 'Deleting...' : <FaTrash />}
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
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
                                <FaFileAlt className="no-results-icon" />
                                <h3>No Registrations Found</h3>
                                <p>There are no registrations matching your current filters.</p>
                                <button 
                                    onClick={() => {
                                        setSearchTerm('');
                                        setSelectedService('All');
                                        fetchRegistrations();
                                    }} 
                                    className="clear-filters-btn"
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
