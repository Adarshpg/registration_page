const express = require('express');
const router = express.Router();
const Registration = require('../models/Registration');

// Create a new registration
router.post('/', async (req, res) => {
  try {
    const { fullName, email, phone, qualification, passingYear, message } = req.body;
    
    // Check if email already exists
    const existingRegistration = await Registration.findOne({ email });
    if (existingRegistration) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const registration = new Registration({
      fullName,
      email,
      phone,
      qualification,
      passingYear,
      message
    });

    await registration.save();
    
    res.status(201).json({
      success: true,
      data: registration
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: error.message 
    });
  }
});

// Get all registrations (for admin purposes)
router.get('/', async (req, res) => {
  try {
    const registrations = await Registration.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: registrations.length,
      data: registrations
    });
  } catch (error) {
    console.error('Error fetching registrations:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: error.message 
    });
  }
});

module.exports = router;
