const express = require('express');
const cors = require('cors');
const app = express();

// Enable CORS for all routes
app.use(cors());

// Test route
app.get('/api/test', (req, res) => {
  console.log('Test endpoint hit');
  res.json({ message: 'Test successful', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
  console.log(`Test endpoint: http://localhost:${PORT}/api/test`);
});
