import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './RegistrationForm.css';

// Services and their respective courses
const SERVICES = [
  { 
    id: 'edutech', 
    name: ' Medini EduTech', 
    courses: ['BIM for Construction', 'BIM for Architecture', 'BIM for Infrastructure','AEC','Product Design and Manufacturing','IT'] 
  },
  { 
    id: 'digidhvani', 
    name: 'DigiDhwani', 
    courses: ['Digital Marketing', 'Content Creation', 'Social Media Management'] 
  },
  { 
    id: 'builddspace', 
    name: 'BuilddSpace', 
    courses: ['Startup Incubation', 'Startup Support'] 
  },
  { 
    id: 'eduphygital', 
    name: 'EduPhyGital', 
    courses: ['Centre of Excellence', 'Centre of Expertise','Hybrid Education'] 
  },
  { 
    id: 'mechsetu', 
    name: 'MechSetu', 
    courses: ['Industrial 3D Printing', 'Multimaterial Printing', 'Micro-precision Printing','Rapid Prototyping',] 
  },
  { 
    id: 'nalaneel', 
    name: 'Nalaneel', 
    courses: ['Custom Software Development', 'Web Development', 'Mobile App Development','Cloud Solutions',] 
  },
  { 
    id: 'bim-construct', 
    name: 'BIM Construct', 
    courses: ['Building Information Modeling', 'Construction Management', 'Architectural Design'] 
  }
];

const RegistrationForm = ({ onMessage }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    qualification: '',
    passingYear: '',
    service: '',
    course: '',
    message: ''
  });
  
  const [availableCourses, setAvailableCourses] = useState([]);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { fullName, email, phone, qualification, passingYear, message, service, course } = formData;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }
  };

  // Update available courses when service changes
  useEffect(() => {
    if (service) {
      const selectedService = SERVICES.find(s => s.name === service);
      if (selectedService) {
        setAvailableCourses(selectedService.courses);
        // Reset course when service changes
        setFormData(prev => ({ ...prev, course: '' }));
      }
    } else {
      setAvailableCourses([]);
      setFormData(prev => ({ ...prev, course: '' }));
    }
  }, [service]);

  const validateForm = () => {
    const newErrors = {};
    
    if (!fullName.trim()) newErrors.fullName = 'Full name is required';
    
    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!phone) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^[0-9]{10}$/.test(phone)) {
      newErrors.phone = 'Phone number must be 10 digits';
    }
    
    if (!qualification) newErrors.qualification = 'Qualification is required';
    
    const currentYear = new Date().getFullYear();
    if (!passingYear) {
      newErrors.passingYear = 'Passing year is required';
    } else if (passingYear < 1900 || passingYear > currentYear + 5) {
      newErrors.passingYear = `Year must be between 1900 and ${currentYear + 5}`;
    }
    
    if (!service) newErrors.service = 'Please select a service';
    if (!course) newErrors.course = 'Please select a course';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      onMessage('Please fix the errors in the form', 'error');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const config = {
        headers: {
          'Content-Type': 'application/json',
        },
      };
      
      const body = JSON.stringify({
        fullName,
        email,
        phone,
        qualification,
        passingYear: Number(passingYear),
        service,
        course,
        message: message || undefined
      });
      
      await axios.post(process.env.REACT_APP_API_URL, body, config);
      
      // Reset form
      setFormData({
        fullName: '',
        email: '',
        phone: '',
        qualification: '',
        passingYear: '',
        message: ''
      });
      
      onMessage('Registration successful!', 'success');
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Error submitting form';
      onMessage(errorMsg, 'error');
      console.error('Registration error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="registration-form-container">
      <h2>Registration Form</h2>
      <form onSubmit={handleSubmit} className="registration-form">
        <div className="form-group">
          <label htmlFor="fullName" className="required">Full Name</label>
          <input
            type="text"
            id="fullName"
            name="fullName"
            value={fullName}
            onChange={handleChange}
            className={errors.fullName ? 'error' : ''}
            required
          />
          {errors.fullName && <span className="error-message">{errors.fullName}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="email" className="required">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            value={email}
            onChange={handleChange}
            className={errors.email ? 'error' : ''}
            required
          />
          {errors.email && <span className="error-message">{errors.email}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="phone" className="required">Phone Number</label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={phone}
            onChange={handleChange}
            className={errors.phone ? 'error' : ''}
            placeholder="10-digit number"
            required
          />
          {errors.phone && <span className="error-message">{errors.phone}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="qualification" className="required">Highest Qualification</label>
          <input
            type="text"
            id="qualification"
            name="qualification"
            value={qualification}
            onChange={handleChange}
            className={errors.qualification ? 'error' : ''}
            required
          />
          {errors.qualification && <span className="error-message">{errors.qualification}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="passingYear" className="required">Year of Passing</label>
          <input
            type="number"
            id="passingYear"
            name="passingYear"
            value={passingYear}
            onChange={handleChange}
            min="1900"
            max={new Date().getFullYear() + 5}
            className={errors.passingYear ? 'error' : ''}
            required
          />
          {errors.passingYear && <span className="error-message">{errors.passingYear}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="service" className="required">Select Service</label>
          <select
            id="service"
            name="service"
            value={service}
            onChange={handleChange}
            className={errors.service ? 'error' : ''}
            required
          >
            <option value="">-- Select a service --</option>
            {SERVICES.map(service => (
              <option key={service.id} value={service.name}>
                {service.name}
              </option>
            ))}
          </select>
          {errors.service && <span className="error-message">{errors.service}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="course" className="required">Select Course</label>
          <select
            id="course"
            name="course"
            value={course}
            onChange={handleChange}
            disabled={!service || availableCourses.length === 0}
            className={errors.course ? 'error' : ''}
            required
          >
            <option value="">-- Select a course --</option>
            {availableCourses.map((course, index) => (
              <option key={index} value={course}>
                {course}
              </option>
            ))}
          </select>
          {errors.course && <span className="error-message">{errors.course}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="message">Message (Optional)</label>
          <textarea
            id="message"
            name="message"
            value={message}
            onChange={handleChange}
            rows="4"
            placeholder="Any additional information you'd like to share..."
          />
        </div>

        <button 
          type="submit" 
          className="submit-btn"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Submitting...' : 'Register'}
        </button>
      </form>
    </div>
  );
};

export default RegistrationForm;
