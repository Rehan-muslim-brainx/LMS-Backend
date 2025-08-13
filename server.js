const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config({ path: __dirname + '/config.env' });



const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy for rate limiting
app.set('trust proxy', 1);

// Middleware
app.use(helmet());

// CORS configuration - Allow all origins with detailed logging
app.use(cors({
  origin: function (origin, callback) {
    console.log('CORS request from origin:', origin);
    // Allow all origins (including no origin for mobile apps, Postman, etc.)
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  optionsSuccessStatus: 200
}));

// Additional manual CORS headers as backup
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling preflight request for:', req.url);
    res.status(200).end();
    return;
  }
  
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting - More lenient for development
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 1000, // limit each IP to 1000 requests per minute
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Test endpoint for debugging
app.get('/', (req, res) => {
  res.json({ 
    message: 'LMS Backend API is running on Vercel',
    status: 'success',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Test endpoint for API
app.get('/api', (req, res) => {
  res.json({ 
    message: 'LMS API is working',
    status: 'success',
    timestamp: new Date().toISOString()
  });
});

// Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'your-anon-key';

// Only create Supabase client if URL is not the placeholder
let supabase;
if (supabaseUrl !== 'https://your-project.supabase.co') {
  supabase = createClient(supabaseUrl, supabaseKey);
} else {
  console.log('⚠️  Supabase not configured. Please update backend/config.env with your Supabase credentials.');
  console.log('📝 For now, the API will run without database connection.');
  supabase = null;
}

// Make supabase available to routes
app.locals.supabase = supabase;

// Routes with individual error handling
const routes = [
  { path: '/api/auth', file: './routes/auth' },
  { path: '/api/courses', file: './routes/courses' },
  { path: '/api/users', file: './routes/users' },
  { path: '/api/enrollments', file: './routes/enrollments' },
  { path: '/api/lessons', file: './routes/lessons' },
  { path: '/api/upload', file: './routes/upload' },
  { path: '/api/departments', file: './routes/departments' }
];

routes.forEach(route => {
  try {
    app.use(route.path, require(route.file));
    console.log(`✅ Route loaded: ${route.path}`);
  } catch (error) {
    console.error(`❌ Failed to load route ${route.path}:`, error.message);
  }
});

console.log('📋 Route loading completed');

// Test route to verify departments path works
app.get('/api/departments/test', (req, res) => {
  res.json({ 
    message: 'Departments route is accessible',
    timestamp: new Date().toISOString()
  });
});

// Serve uploaded files statically (simplified for Vercel)
app.use('/uploads', express.static('uploads', {
  setHeaders: (res, path) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET');
  }
}));

// Test route for debugging
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'LMS API is running',
    status: 'success',
    timestamp: new Date().toISOString(),
    supabaseConfigured: supabase !== null
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    message: 'Route not found',
    path: req.path,
    method: req.method
  });
});

// Start server (only in development, not on Vercel)
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Export the app for Vercel
module.exports = app; 