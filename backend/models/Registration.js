const mongoose = require('mongoose');
const validator = require('validator');

const registrationSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, 'Please enter your full name'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Please enter your email'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please enter a valid email']
  },
  phone: {
    type: String,
    required: [true, 'Please enter your phone number'],
    validate: {
      validator: function(v) {
        return /^[0-9]{10}$/.test(v);
      },
      message: props => `${props.value} is not a valid phone number!`
    }
  },
  qualification: {
    type: String,
    required: [true, 'Please enter your qualification'],
    trim: true
  },
  passingYear: {
    type: Number,
    required: [true, 'Please enter your passing year'],
    min: [1900, 'Year must be after 1900'],
    max: [new Date().getFullYear() + 5, 'Year cannot be in the future']
  },
  service: {
    type: String,
    required: [true, 'Please select a service'],
    trim: true
  },
  course: {
    type: String,
    required: [true, 'Please select a course'],
    trim: true
  },
  message: {
    type: String,
    trim: true,
    maxlength: [500, 'Message cannot exceed 500 characters']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Add indexes for better query performance
registrationSchema.index({ email: 1 }, { unique: true });
registrationSchema.index({ service: 1 });
registrationSchema.index({ course: 1 });
registrationSchema.index({ createdAt: -1 });

// Create the model with explicit collection name to match your MongoDB Atlas collection
const Registration = mongoose.model('Registration', registrationSchema, 'registrations');

module.exports = Registration;
