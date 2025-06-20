import React, { useState } from 'react';
import axios from 'axios';
import './RegistrationForm.css';

const RegistrationForm = ({ onMessage }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    qualification: '',
    passingYear: '',
    message: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { fullName, email, phone, qualification, passingYear, message } = formData;

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
        message: message || undefined
      });
      
      await axios.post('https://adarshpg-registration-page.onrender.com/api/registrations', body, config);
      
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
      <form onSubmit={handleSubmit} className="registration-form">
        <div className="form-group">
          <label htmlFor="fullName">Full Name *</label>
          <input
            type="text"
            id="fullName"
            name="fullName"
            value={fullName}
            onChange={handleChange}
            className={errors.fullName ? 'error' : ''}
            placeholder="Enter your full name"
          />
          {errors.fullName && <span className="error-message">{errors.fullName}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="email">Email *</label>
          <input
            type="email"
            id="email"
            name="email"
            value={email}
            onChange={handleChange}
            className={errors.email ? 'error' : ''}
            placeholder="Enter your email"
          />
          {errors.email && <span className="error-message">{errors.email}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="phone">Phone Number *</label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={phone}
            onChange={handleChange}
            className={errors.phone ? 'error' : ''}
            placeholder="Enter your 10-digit phone number"
          />
          {errors.phone && <span className="error-message">{errors.phone}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="qualification">Qualification *</label>
          <input
            type="text"
            id="qualification"
            name="qualification"
            value={qualification}
            onChange={handleChange}
            className={errors.qualification ? 'error' : ''}
            placeholder="e.g., B.Tech, BCA, MCA, etc."
          />
          {errors.qualification && <span className="error-message">{errors.qualification}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="passingYear">Passing Year *</label>
          <input
            type="number"
            id="passingYear"
            name="passingYear"
            value={passingYear}
            onChange={handleChange}
            min="1900"
            max={new Date().getFullYear() + 5}
            className={errors.passingYear ? 'error' : ''}
            placeholder="e.g., 2023"
          />
          {errors.passingYear && <span className="error-message">{errors.passingYear}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="message">Message (Optional)</label>
          <textarea
            id="message"
            name="message"
            value={message}
            onChange={handleChange}
            rows="4"
            placeholder="Any additional information about your projects..."
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
