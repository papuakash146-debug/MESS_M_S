const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const apiRoutes = require('./routes/api');

dotenv.config();
connectDB();

const app = express();

// Enhanced CORS configuration for production
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, postman)
    if (!origin) return callback(null, true);
    
    // List of allowed origins
    const allowedOrigins = [
      'http://localhost:19006',
      'http://localhost:19000',
      'exp://',
      'http://192.168.',
      'https://your-frontend-domain.com' // Add your frontend domain if deployed
    ];
    
    // Check if origin matches any allowed pattern
    const isAllowed = allowedOrigins.some(allowedOrigin => 
      origin.startsWith(allowedOrigin)
    );
    
    if (isAllowed) {
      callback(null, true);
    } else {
      // For development, you can allow all origins
      // For production, you should restrict to specific domains
      callback(null, true); // Allow all for now - change this for production
      // callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400 // 24 hours
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Routes
app.use('/api', require('./routes/api'));

// Health check endpoint (important for Render)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: 'connected', // You can add DB health check here
    version: '1.0.0'
  });
});

// Default route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Mess Management System API',
    version: '1.0.0',
    status: 'running',
    documentation: {
      login: 'POST /api/login',
      menu: 'GET /api/menu',
      attendance: 'GET /api/attendance',
      expenses: 'GET /api/expenses',
      health: 'GET /health'
    },
    endpoints: [
      { method: 'POST', path: '/api/login', description: 'User login' },
      { method: 'GET', path: '/api/menu', description: 'Get weekly menu' },
      { method: 'POST', path: '/api/menu', description: 'Add/update menu' },
      { method: 'GET', path: '/api/attendance/:date?', description: 'Get attendance' },
      { method: 'POST', path: '/api/attendance', description: 'Mark attendance' },
      { method: 'GET', path: '/api/expenses', description: 'Get all expenses' },
      { method: 'POST', path: '/api/expenses', description: 'Add expense' },
      { method: 'PUT', path: '/api/expenses/:id', description: 'Update expense' },
      { method: 'DELETE', path: '/api/expenses/:id', description: 'Delete expense' },
      { method: 'GET', path: '/api/students', description: 'Get all students' },
      { method: 'GET', path: '/health', description: 'Health check' }
    ]
  });
});


// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  
  // Mongoose validation error
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: Object.values(err.errors).map(e => e.message)
    });
  }
  
  // Mongoose duplicate key error
  if (err.code === 11000) {
    return res.status(400).json({
      success: false,
      message: 'Duplicate field value entered'
    });
  }
  
  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
  
  // Default error
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📄 API Documentation: http://localhost:${PORT}`);
  console.log(`❤️  Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  // Close server & exit process
  server.close(() => {
    process.exit(1);
  });
});