const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
require('dotenv').config();

// Connect to database
connectDB();

const app = express();

// CORS Configuration
const allowedOrigins = [
  'http://localhost:3000',
  'https://adarshpg-registration-page.onrender.com',
  'https://adarshpg-registration-page.onrender.com/',
  'https://adarshpg-registration-page.onrender.com'
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = `The CORS policy for this site does not allow access from the specified origin: ${origin}`;
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Content-Length', 'X-Requested-With'],
  credentials: true,
  optionsSuccessStatus: 200
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

// Use the port from environment variables or default to 10000 for local development
const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`);
  // Close server & exit process
  // server.close(() => process.exit(1));
});
