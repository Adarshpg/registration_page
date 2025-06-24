const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  // Connection configuration
  const options = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 10000, // Increase timeout to 10s
    socketTimeoutMS: 60000, // Increase socket timeout to 60s
    maxPoolSize: 10, // Maximum number of connections in the connection pool
    minPoolSize: 1, // Minimum number of connections in the connection pool
    maxIdleTimeMS: 30000, // Close idle connections after 30s
    family: 4, // Use IPv4, skip trying IPv6
    retryWrites: true,
    w: 'majority',
    appName: 'registration-app',
    autoIndex: process.env.NODE_ENV !== 'production', // Auto create indexes in dev only
  };

  try {
    // Connect to MongoDB with retry logic
    let retries = 5;
    let conn;
    
    while (retries) {
      try {
        conn = await mongoose.connect(process.env.MONGODB_URI, options);
        break;
      } catch (err) {
        console.error(`MongoDB connection error (${retries} retries left):`, err.message);
        retries -= 1;
        if (retries === 0) throw err;
        // Wait for 5 seconds before retrying
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    
    // Log successful connection
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    
    // Handle connection events
    mongoose.connection.on('connected', () => {
      console.log('✅ Mongoose connected to DB');
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ Mongoose connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('ℹ️ Mongoose disconnected from DB');
    });
    
    // Graceful shutdown
    process.on('SIGINT', async () => {
      try {
        await mongoose.connection.close();
        console.log('MongoDB connection closed through app termination');
        process.exit(0);
      } catch (err) {
        console.error('Error closing MongoDB connection:', err);
        process.exit(1);
      }
    });
    
    return conn;
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    // Exit process with failure
    process.exit(1);
  }
};

module.exports = connectDB;

