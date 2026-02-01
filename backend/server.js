const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// TenaMed Backend Server - Deployed with Admin Credentials
// CORS configuration
const allowedOrigins = [
  'https://tena-med.vercel.app',
  'https://tena-65tcayt50-ruths-projects-7791b467.vercel.app',
  'https://tena-70d19m7yr-ruths-projects-7791b467.vercel.app',
  'https://tena-he3eopgfq-ruths-projects-7791b467.vercel.app',
  'https://tena-a4b8yj1vo-ruths-projects-7791b467.vercel.app',
  'https://tena-7iciju1xk-ruths-projects-7791b467.vercel.app',
  'https://tena-inbg7z4iw-ruths-projects-7791b467.vercel.app',
  'https://tena-raw7gfqm6-ruths-projects-7791b467.vercel.app',
  'https://tena-2ocycutxu-ruths-projects-7791b467.vercel.app',
  'https://tena-kdb86m7rw-ruths-projects-7791b467.vercel.app',
  'https://tena-pdhk4uek0-ruths-projects-7791b467.vercel.app',
  'https://tena-7wka3y73s-ruths-projects-7791b467.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173'
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    // Allow all Vercel preview URLs and production URL
    if (origin.includes('vercel.app') || 
        origin.includes('localhost:3000') || 
        origin.includes('localhost:5173')) {
      return callback(null, true);
    }
    
    // Check specific allowed origins as fallback
    if (allowedOrigins.some(allowedOrigin => 
      allowedOrigin === origin)) {
      return callback(null, true);
    }
    
    // Block other origins
    console.log('CORS blocked origin:', origin);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'cache-control', 'pragma', 'cache-store', 'client-security-token']
};

// Security middleware
app.use(helmet());

// Apply CORS with options
app.use(cors(corsOptions));
console.log('🔧 CORS methods:', ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']);

// Handle preflight requests
app.options('*', cors(corsOptions));

// Rate limiting - temporarily disabled for testing
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 100 // limit each IP to 100 requests per windowMs
// });
// app.use(limiter);

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development'
  });
});

// Database connection
console.log('🔌 Connecting to MongoDB...');
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(async () => {
  console.log('✅ MongoDB connected successfully');
  
  // Seed hardcoded dispatcher
  const seedDispatcher = require('./seedDispatcher');
  await seedDispatcher();
  
  console.log('🚀 Server starting...');
})
.catch((err) => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1); // Exit if MongoDB connection fails
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/pharmacies', require('./routes/pharmacies'));
app.use('/api/drugs', require('./routes/drugs'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/delivery', require('./routes/delivery'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/dispatcher', require('./routes/dispatcher'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/supplier', require('./routes/supplier'));
app.use('/api/supplier-orders', require('./routes/supplier-orders'));
app.use('/api/government', require('./routes/government'));
app.use('/api/prescriptions', require('./routes/prescriptions'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🎉 Server running successfully on port ${PORT}`);
  console.log(`🌐 API endpoints available at: http://localhost:${PORT}/api`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
