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
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5000',
  'https://adarshpg-registration-page-ok2y.vercel.app'
];

// Apply CORS to Express app
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if the origin is in the allowed list
    if (allowedOrigins.includes(origin) || 
        allowedOrigins.some(allowedOrigin => origin.startsWith(allowedOrigin))) {
      return callback(null, true);
    }
    
    const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
    return callback(new Error(msg), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Initialize Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
  },
  path: '/socket.io/',
  serveClient: false,
  transports: ['websocket', 'polling'],
  pingTimeout: 30000,
  pingInterval: 25000
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

  // Handle new registration event
  socket.on('newRegistration', async (registration) => {
    try {
      // Fetch all registrations to ensure we have the latest data
      const Registration = require('./models/Registration');
      const registrations = await Registration.find().sort({ createdAt: -1 });
      
      // Emit the updated list to all connected clients
      io.emit('newRegistration', registrations);
      console.log('Emitted new registration to all clients');
    } catch (error) {
      console.error('Error handling new registration:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
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
