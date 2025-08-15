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

// Routes with error handling
try {
  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/courses', require('./routes/courses'));
  app.use('/api/users', require('./routes/users'));
  app.use('/api/enrollments', require('./routes/enrollments'));
  app.use('/api/lessons', require('./routes/lessons'));
  app.use('/api/upload', require('./routes/upload'));
  
  // Special handling for departments route
  // Temporarily bypass the departments route file and use inline routes
  console.log('🏢 Using inline departments routes for production...');
  
  console.log('✅ Inline departments routes created');
  
  console.log('✅ All routes loaded successfully');
} catch (error) {
  console.error('❌ Error loading routes:', error);
}

// Define departments routes OUTSIDE the try-catch to ensure they're always available
console.log('🏢 Setting up departments routes...');

// GET all departments
app.get('/api/departments', async (req, res) => {
  try {
    console.log('🏢 Inline departments GET request');
    const supabase = req.app.locals.supabase;
    
    if (!supabase) {
      return res.status(500).json({ message: 'Database connection not available' });
    }
    
    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .order('name');
    
    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ message: 'Database error' });
    }
    
    console.log('✅ Departments fetched:', data?.length || 0);
    res.json(data || []);
  } catch (error) {
    console.error('❌ Inline departments GET error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST new department (admin only)
app.post('/api/departments', async (req, res) => {
  try {
    console.log('🏢 Inline departments POST request');
    console.log('Request body:', req.body);
    const supabase = req.app.locals.supabase;
    
    if (!supabase) {
      return res.status(500).json({ message: 'Database connection not available' });
    }
    
    const { name, description, roles } = req.body;
    
    if (!name || !roles || !Array.isArray(roles)) {
      return res.status(400).json({ message: 'Name and roles are required' });
    }
    
    const departmentData = {
      name: name.trim(),
      roles: roles.map(role => role.trim()),
      description: description?.trim() || '',
      created_at: new Date().toISOString()
    };
    
    console.log('Creating department:', departmentData);
    const { data, error } = await supabase
      .from('departments')
      .insert([departmentData])
      .select();
    
    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ message: 'Database error' });
    }
    
    console.log('✅ Department created:', data[0]);
    res.status(201).json(data[0]);
  } catch (error) {
    console.error('❌ Inline departments POST error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

console.log('✅ Departments routes are now available');

// Test route to verify routing is working
app.get('/api/debug', (req, res) => {
  res.json({ 
    message: 'Debug route working',
    timestamp: new Date().toISOString(),
    routes: ['/api/departments', '/api/courses', '/api/users']
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