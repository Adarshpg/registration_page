const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Registration = require('../models/Registration');

// Get the io instance from app settings
const getIo = (req) => {
  return req.app.get('io');
};

// Create a new registration
router.post('/', async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { 
      fullName, 
      email, 
      phone, 
      qualification, 
      passingYear, 
      message, 
      service, 
      course 
    } = req.body;
    
    // Basic validation
    const requiredFields = { fullName, email, phone, service, course };
    const missingFields = Object.entries(requiredFields)
      .filter(([_, value]) => !value)
      .map(([key]) => key);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }
    
    // Check if email already exists
    const existingRegistration = await Registration.findOne({ email }).session(session);
    if (existingRegistration) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Create and save the new registration
    const registration = new Registration({
      fullName: fullName.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      qualification: qualification ? qualification.trim() : 'Not specified',
      passingYear: passingYear || new Date().getFullYear(),
      service: service.trim(),
      course: course.trim(),
      message: message ? message.trim() : '',
      createdAt: new Date()
    });

    const savedRegistration = await registration.save({ session });
    
    // Commit the transaction
    await session.commitTransaction();
    session.endSession();
    
    // Get the full saved document
    const newRegistration = await Registration.findById(savedRegistration._id).lean();
    
    // Emit new registration event to all connected clients
    try {
      const io = req.app.get('io');
      if (io) {
        // Add timestamp and source to the event
        const registrationEvent = {
          ...newRegistration,
          eventSource: 'registration-api',
          timestamp: new Date().toISOString()
        };
        
        console.log('📢 Emitting newRegistration event to admin room:', {
          registrationId: registrationEvent._id,
          email: registrationEvent.email,
          timestamp: registrationEvent.timestamp
        });
        
        // Emit only to the admin room
        io.to('admin').emit('newRegistration', registrationEvent);
        
        // Also log to all connected clients for debugging
        console.log(`📡 Emitted to ${io.sockets.adapter.rooms.get('admin')?.size || 0} admin clients`);
      } else {
        console.warn('WebSocket server not available for emitting new registration event');
      }
    } catch (wsError) {
      console.error('Error emitting WebSocket event:', wsError);
      // Don't fail the request if WebSocket emission fails
    }
    
    // Send success response
    res.status(201).json({
      success: true,
      data: newRegistration
    });
  } catch (error) {
    console.error('Registration error:', error);
    
    // Abort transaction and end session in case of error
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    if (session.inTransaction()) {
      session.endSession();
    }
    
    // Determine appropriate status code
    let statusCode = 500;
    let errorMessage = 'Server error';
    
    if (error.name === 'ValidationError') {
      statusCode = 400;
      errorMessage = Object.values(error.errors).map(e => e.message).join('. ');
    } else if (error.name === 'MongoError' && error.code === 11000) {
      statusCode = 400;
      errorMessage = 'Email already exists';
    }
    
    res.status(statusCode).json({
      success: false,
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get all registrations (for admin purposes)
router.get('/', async (req, res) => {
  console.log('Fetching all registrations...');
  
  try {
    // Parse query parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100; // Default to 100 items per page
    const skip = (page - 1) * limit;
    
    // Build query
    const query = {};
    
    // Add search filter if provided
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      query.$or = [
        { fullName: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
        { service: searchRegex },
        { course: searchRegex }
      ];
    }
    
    // Add service filter if provided
    if (req.query.service) {
      query.service = req.query.service;
    }
    
    // Execute queries in parallel
    const [registrations, total] = await Promise.all([
      Registration.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      Registration.countDocuments(query)
    ]);
    
    console.log(`Found ${registrations.length} registrations out of ${total}`);
    
    // Process registrations to ensure consistent data structure
    const processedRegistrations = registrations.map(reg => {
      try {
        if (!reg) {
          console.warn('Found null/undefined registration in database');
          return null;
        }
        
        // Create a safe registration object with default values
        const safeReg = {
          _id: reg._id ? reg._id.toString() : new mongoose.Types.ObjectId().toString(),
          fullName: String(reg.fullName || 'Unknown').trim(),
          email: String(reg.email || '').trim().toLowerCase(),
          phone: String(reg.phone || '').trim(),
          qualification: String(reg.qualification || 'Not specified').trim(),
          passingYear: String(reg.passingYear || 'N/A').trim(),
          service: String(reg.service || 'General').trim(),
          course: String(reg.course || 'Not specified').trim(),
          message: String(reg.message || '').trim(),
          createdAt: reg.createdAt instanceof Date ? reg.createdAt : new Date(),
          __v: reg.__v
        };
        
        // Ensure createdAt is a valid date
        if (isNaN(safeReg.createdAt.getTime())) {
          safeReg.createdAt = new Date();
        }
        
        return safeReg;
      } catch (processError) {
        console.error('Error processing registration:', processError, 'Raw data:', reg);
        return null;
      }
    }).filter(Boolean); // Remove any null entries from processing errors
    
    console.log(`Successfully processed ${processedRegistrations.length} registrations`);
    
    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;
    
    res.status(200).json({
      success: true,
      count: processedRegistrations.length,
      total,
      page,
      totalPages,
      hasNextPage,
      hasPreviousPage,
      data: processedRegistrations
    });
  } catch (error) {
    console.error('Error in GET /api/registrations:', error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Server error while fetching registrations',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

module.exports = router;
