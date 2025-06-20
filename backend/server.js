const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
require('dotenv').config();

// Connect to database
connectDB();

const app = express();

// CORS Configuration
const corsOptions = {
  origin: 'http://localhost:3000', // Frontend URL
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200 // Some legacy browsers choke on 204
};

// Middleware
app.use(express.json());
app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

// Define Routes
app.use('/api/registrations', require('./routes/registrationRoutes'));

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  // Set static folder - only if it exists
  const clientBuildPath = path.join(__dirname, 'client', 'build');
  
  // Check if the build directory exists
  if (require('fs').existsSync(clientBuildPath)) {
    console.log('Serving static files from:', clientBuildPath);
    app.use(express.static(clientBuildPath));

    // Handle SPA routing - serve index.html for all routes
    app.get('*', (req, res) => {
      res.sendFile(path.join(clientBuildPath, 'index.html'));
    });
  } else {
    console.log('No client build found. Running in API-only mode.');
    // Provide a simple response for the root route
    app.get('/', (req, res) => {
      res.json({
        message: 'Backend API is running',
        status: 'success',
        timestamp: new Date().toISOString()
      });
    });
  }
}

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`);
  // Close server & exit process
  // server.close(() => process.exit(1));
});
