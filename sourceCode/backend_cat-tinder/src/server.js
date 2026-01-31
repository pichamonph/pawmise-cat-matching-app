const express = require('express');
const http = require('http');
const cors = require('cors');
require('dotenv').config();

// Import connectDB
const connectDB = require('./config/db');
const { initializeSocket } = require('./socket/socketServer');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increase JSON limit
app.use(express.urlencoded({ extended: true, limit: '50mb' })); // Increase URL encoded limit

// Routes
app.use('/api/auth', require('./routes/authRoute'));
app.use('/api/owners', require('./routes/ownersRoute'));
app.use('/api/cats', require('./routes/catsRoute'));
app.use('/api/swipes', require('./routes/swipesRoute'));
app.use('/api/matches', require('./routes/matchesRoute'));
app.use('/api/messages', require('./routes/messagesRoute'));

// ✅ เชื่อมต่อ MongoDB ก่อนเริ่ม server
connectDB();

// Initialize Socket.IO
const io = initializeSocket(server);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`🔌 Socket.IO server is ready`);
  console.log(`📡 API URL: http://localhost:${PORT}`);
});

// Set server timeout for long-running requests (like file uploads)
server.timeout = 300000; // 5 minutes
server.keepAliveTimeout = 30000; // 30 seconds
server.headersTimeout = 31000; // 31 seconds (should be higher than keepAliveTimeout)