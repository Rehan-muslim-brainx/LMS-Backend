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

// CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

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

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/courses', require('./routes/courses'));
app.use('/api/lessons', require('./routes/lessons'));
app.use('/api/enrollments', require('./routes/enrollments'));
app.use('/api/assets', require('./routes/assets'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/departments', require('./routes/departments'));

// Test endpoint for debugging
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Backend is working!', 
    timestamp: new Date().toISOString(),
    cors: 'enabled'
  });
});

// Serve uploaded files statically
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  // Remove CSP headers for static files to allow cross-origin access
  res.removeHeader('Content-Security-Policy');
  next();
}, express.static('uploads'));

// Basic route
app.get('/', (req, res) => {
  res.json({ 
    message: 'LMS API is running',
    status: 'success',
    timestamp: new Date().toISOString(),
    supabaseConfigured: supabase !== null
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 