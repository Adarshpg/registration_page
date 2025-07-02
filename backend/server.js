const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
require('dotenv').config();

// Connect to database
connectDB();

const app = express();
const server = http.createServer(app);

// CORS and WebSocket Configuration
// Parse CORS_ORIGINS from environment variable with better error handling
let allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5000',
  'https://registration-page-7c8o.vercel.app',
  'https://adarshpg-registration-page.onrender.com',
  'https://register.medinitechnologies.in',
];

// Add any additional origins from environment variable
if (process.env.CORS_ORIGINS) {
  try {
    const envOrigins = process.env.CORS_ORIGINS
      .split(',')
      .map(origin => origin.trim())
      .filter(origin => origin);
    
    // Add any new origins from env that aren't already in the list
    envOrigins.forEach(origin => {
      if (!allowedOrigins.includes(origin)) {
        allowedOrigins.push(origin);
      }
    });
  } catch (error) {
    console.error('Error parsing CORS_ORIGINS:', error);
  }
}

// Log allowed origins for debugging
console.log('Allowed CORS origins:', allowedOrigins);

// Apply CORS to Express app with more permissive settings
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, or server-to-server requests)
    if (!origin) {
      console.log('No origin - allowing request');
      return callback(null, true);
    }
    
    // Normalize the origin by removing trailing slashes
    const normalizedOrigin = origin.endsWith('/') ? origin.slice(0, -1) : origin;
    
    // Check if the origin is in the allowed list
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      // Handle wildcard subdomains (e.g., 'https://*.example.com')
      if (allowedOrigin.includes('*')) {
        const regexPattern = '^' + allowedOrigin.replace(/\*/g, '.*').replace(/\./g, '\\.');
        return new RegExp(regexPattern).test(normalizedOrigin);
      }
      
      // Exact match or starts with match (for paths)
      return (
        normalizedOrigin === allowedOrigin ||
        normalizedOrigin.startsWith(allowedOrigin + '/') ||
        normalizedOrigin.startsWith(allowedOrigin.replace(/https?:\/\//, 'http://')) ||
        normalizedOrigin.startsWith(allowedOrigin.replace(/https?:\/\//, 'https://'))
      );
    });
    
    if (isAllowed) {
      console.log(`CORS allowed for origin: ${origin}`);
      return callback(null, true);
    }
    
    console.warn('CORS blocked for origin:', origin);
    console.warn('Allowed origins:', allowedOrigins);
    
    const error = new Error(`The CORS policy for this site does not allow access from the specified Origin: ${origin}`);
    error.status = 403;
    return callback(error, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'X-Auth-Token',
    'X-Requested-With',
    'X-CSRF-Token',
    'Access-Control-Allow-Headers',
    'Access-Control-Allow-Origin',
    'Access-Control-Allow-Credentials'
  ],
  exposedHeaders: [
    'Content-Length',
    'Date',
    'X-Request-Id',
    'X-Powered-By',
    'X-Content-Type-Options'
  ],
  maxAge: 600, // How long the results of a preflight request can be cached (in seconds)
  preflightContinue: false,
  optionsSuccessStatus: 200 // Some legacy browsers (IE11, various SmartTVs) choke on 204
}));

// Initialize Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or server-to-server requests)
      if (!origin) {
        console.log('WebSocket: No origin - allowing connection');
        return callback(null, true);
      }
      
      // Normalize the origin by removing trailing slashes
      const normalizedOrigin = origin.endsWith('/') ? origin.slice(0, -1) : origin;
      
      // Check if the origin is in the allowed list
      const isAllowed = allowedOrigins.some(allowedOrigin => {
        // Handle wildcard subdomains (e.g., 'https://*.example.com')
        if (allowedOrigin.includes('*')) {
          const regexPattern = '^' + allowedOrigin.replace(/\*/g, '.*').replace(/\./g, '\\.');
          return new RegExp(regexPattern).test(normalizedOrigin);
        }
        
        // Exact match or starts with match (for paths)
        return (
          normalizedOrigin === allowedOrigin ||
          normalizedOrigin.startsWith(allowedOrigin + '/') ||
          normalizedOrigin.startsWith(allowedOrigin.replace(/https?:\/\//, 'http://')) ||
          normalizedOrigin.startsWith(allowedOrigin.replace(/https?:\/\//, 'https://'))
        );
      });
      
      if (isAllowed) {
        console.log(`WebSocket: CORS allowed for origin: ${origin}`);
        return callback(null, true);
      }
      
      console.warn('WebSocket: CORS blocked for origin:', origin);
      console.warn('WebSocket: Allowed origins:', allowedOrigins);
      
      const error = new Error('Not allowed by CORS');
      error.status = 403;
      return callback(error, false);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
      'X-Auth-Token',
      'X-Requested-With',
      'X-CSRF-Token',
      'Access-Control-Allow-Headers',
      'Access-Control-Allow-Origin',
      'Access-Control-Allow-Credentials'
    ]
  },
  path: '/socket.io/',
  serveClient: false,
  transports: ['websocket', 'polling'],
  pingTimeout: 30000,
  pingInterval: 25000,
  // Enable HTTP long-polling fallback
  allowEIO3: true,
  // Increase maxHttpBufferSize if you expect large messages
  maxHttpBufferSize: 1e8, // 100MB
  // Enable HTTP compression
  httpCompression: true,
  // Enable WebSocket compression
  perMessageDeflate: {
    threshold: 1024, // Size threshold in bytes for message compression
    zlibDeflateOptions: {
      level: 3 // Compression level (0-9), 3 is a good balance between speed and compression
    },
    zlibInflateOptions: {
      chunkSize: 10 * 1024 // 10KB chunks
    },
    // Other clients must support compression
    clientNoContextTakeover: true,
    serverNoContextTakeover: true,
    // Other options
    concurrencyLimit: 10,
    // Whether to use the server's max window bits
    serverMaxWindowBits: 10
  },
  // Add additional headers and connection settings
  allowRequest: (req, callback) => {
    // Add any additional request validation here
    callback(null, true); // Authorize all requests by default
  },
  // Handle connection errors
  connectTimeout: 10000, // 10 seconds
  // Timeout for upgrade requests
  upgradeTimeout: 10000, // 10 seconds
  // Allow protocol upgrades (HTTP to WebSocket)
  allowUpgrades: true
});

// Make io accessible to our router
app.set('io', io);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('✅ New client connected:', socket.id);

  // Handle admin room joining
  socket.on('joinAdminRoom', () => {
    socket.join('admin');
    console.log(`Client ${socket.id} joined admin room`);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('❌ Client disconnected:', socket.id);
  });

  // Handle errors
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });


});

// Make io accessible to our router
app.set('io', io);

// Middleware
app.use(express.json());

// Handle preflight requests
app.options('*', cors());

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

// Use the port from environment variables or default to 5000 for local development
const PORT = process.env.PORT || 5000;

// Use server.listen() instead of app.listen() for WebSocket support
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server is running`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`);
  // Close server & exit process
  // server.close(() => process.exit(1));
});
