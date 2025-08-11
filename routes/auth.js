const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const { createClient } = require('@supabase/supabase-js');
const User = require('../models/User');
const OTP = require('../models/OTP');
const emailService = require('../services/emailService');

const router = express.Router();

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL || 'fallback-url',
  process.env.SUPABASE_ANON_KEY || 'fallback-key'
);

const userModel = new User(supabase);

// Register endpoint - Start OTP process
router.post('/register', [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('role').notEmpty().withMessage('Role is required'),
  body('department').notEmpty().withMessage('Department is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, role, department } = req.body;

    // Validate email domain - Only allow @brainxtech.com emails
    if (!email.endsWith('@brainxtech.com')) {
      return res.status(400).json({ message: 'Please use Brainxtech email address' });
    }

    const supabase = req.app.locals.supabase;
    const userModel = new User(supabase);
    const Department = require('../models/Department');
    const departmentModel = new Department(supabase);

    // Get all departments to validate the selected department and role
    const departments = await departmentModel.getAll();
    const selectedDepartment = departments.find(dept => dept.name === department);

    if (!selectedDepartment) {
      return res.status(400).json({ message: 'Invalid department. Please select a valid department.' });
    }

    // Validate role against the selected department's available roles
    if (!selectedDepartment.roles.includes(role)) {
      return res.status(400).json({ 
        message: `Invalid role for ${department} department. Available roles: ${selectedDepartment.roles.join(', ')}` 
      });
    }

    // Check if user already exists (email should be unique)
    const emailExists = await userModel.emailExists(email);
    if (emailExists) {
      return res.status(400).json({ message: 'An account with this email already exists.' });
    }

    // Initialize OTP model
    const otpModel = new OTP();

    // Generate OTP
    const otp = otpModel.generateOTP();
    console.log(`Generated OTP for ${email}: ${otp}`);

    // Create OTP in database
    await otpModel.createOTP(email, otp, 'registration');

    // Store temporary user data
    const tempUserData = {
      name,
      email,
      role,
      department,
      otp,
      otp_expires: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    };

    // Send OTP email
    try {
      await emailService.sendOTP(email, otp, 'registration');
      res.json({ 
        message: 'OTP sent to your email. Please check your inbox.',
        email: email.replace(/(.{2})(.*)(@.*)/, '$1***$3') // Partially hide email
      });
    } catch (emailError) {
      console.error('Failed to send OTP email:', emailError);
      res.status(500).json({ message: 'Failed to send OTP email. Please try again.' });
    }
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Step 2: Verify OTP and complete registration
router.post('/verify-registration', [
  body('email').isEmail().withMessage('Please include a valid email'),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
  body('name').notEmpty().withMessage('Name is required'),
  body('role').notEmpty().withMessage('Role is required'),
  body('department').notEmpty().withMessage('Department is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, otp, name, role, department } = req.body;

    // Validate email domain - Only allow @brainxtech.com emails
    if (!email.endsWith('@brainxtech.com')) {
      return res.status(400).json({ message: 'Please use Brainxtech email address' });
    }

    const supabase = req.app.locals.supabase;
    const userModel = new User(supabase);
    const Department = require('../models/Department');
    const departmentModel = new Department(supabase);

    // Get all departments to validate the selected department and role
    const departments = await departmentModel.getAll();
    const selectedDepartment = departments.find(dept => dept.name === department);

    if (!selectedDepartment) {
      return res.status(400).json({ message: 'Invalid department. Please select a valid department.' });
    }

    // Validate role against the selected department's available roles
    if (!selectedDepartment.roles.includes(role)) {
      return res.status(400).json({ 
        message: `Invalid role for ${department} department. Available roles: ${selectedDepartment.roles.join(', ')}` 
      });
    }

    // Verify OTP
    const otpModel = new OTP();
    const isValidOTP = await otpModel.verifyOTP(email, otp, 'registration');
    
    if (!isValidOTP) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    // Check if user already exists (email should be unique)
    const emailExists = await userModel.emailExists(email);
    if (emailExists) {
      return res.status(400).json({ message: 'An account with this email already exists.' });
    }

    // Create user
    const userData = {
      name,
      email,
      role,
      department,
      status: 'active',
      created_at: new Date().toISOString()
    };

    const user = await userModel.create(userData);

    // Clean up OTP
    await otpModel.deleteOTPsForEmail(email);

    // Generate JWT token
    const token = jwt.sign(
      { user: { id: user.id, email: user.email, role: user.role, department: user.department } },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Registration completed successfully',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department
      }
    });
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Step 1: Login - Send OTP to email
router.post('/login', [
  body('email').isEmail().withMessage('Please include a valid email')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;

    // Check if user exists
    const userExists = await userModel.emailExists(email);
    if (!userExists) {
      return res.status(400).json({ message: 'User not found. Please register first.' });
    }

    // Generate and send OTP
    const otpModel = new OTP();
    const otp = otpModel.generateOTP();
    await otpModel.createOTP(email, otp, 'login');
    await emailService.sendOTP(email, otp, 'login');

    res.json({ 
      message: 'OTP sent to your email. Please verify to login.',
      requiresOTP: true,
      email
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Step 2: Verify OTP and complete login
router.post('/verify-login', [
  body('email').isEmail().withMessage('Please include a valid email'),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, otp } = req.body;

    // Verify OTP
    const otpModel = new OTP();
    const isValidOTP = await otpModel.verifyOTP(email, otp, 'login');
    if (!isValidOTP) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    // Get user
    const user = await userModel.getByEmail(email);
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    // Clean up OTPs for this email
    await otpModel.deleteOTPsForEmail(email);

    // Generate JWT token
    const payload = {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    };

    jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' }, (err, token) => {
      if (err) throw err;
      res.json({ 
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });
    });

  } catch (error) {
    console.error('Verify login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Resend OTP
router.post('/resend-otp', [
  body('email').isEmail().withMessage('Please include a valid email'),
  body('purpose').isIn(['login', 'registration']).withMessage('Invalid purpose')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, purpose } = req.body;

    // For login, check if user exists
    if (purpose === 'login') {
      const userExists = await userModel.emailExists(email);
      if (!userExists) {
        return res.status(400).json({ message: 'User not found' });
      }
    }

    // Clean up old OTPs
    const otpModel = new OTP();
    await otpModel.deleteOTPsForEmail(email);

    // Generate and send new OTP
    const otp = otpModel.generateOTP();
    await otpModel.createOTP(email, otp, purpose);
    await emailService.sendOTP(email, otp, purpose);

    res.json({ message: 'New OTP sent to your email' });

  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin login with email and password
router.post('/admin-login', [
  body('email').isEmail().withMessage('Please include a valid email'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Get user by email
    const user = await userModel.getByEmail(email);
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check if user is admin
    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin login only.' });
    }

    // For now, use a hardcoded admin password since password column doesn't exist
    // TODO: Add password column to users table in Supabase dashboard
    const adminPassword = 'admin123'; // Change this in production
    
    if (password !== adminPassword) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const payload = {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        department: user.department || null
      }
    };

    jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' }, (err, token) => {
      if (err) throw err;
      res.json({ 
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department || null
        }
      });
    });

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get current user
router.get('/me', auth, async (req, res) => {
  try {
    const user = await userModel.getById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Cleanup expired OTPs (background job)
setInterval(async () => {
  try {
    const otpModel = new OTP(); // Re-initialize otpModel for cleanup
    await otpModel.cleanupExpiredOTPs();
  } catch (error) {
    console.error('OTP cleanup error:', error);
  }
}, 15 * 60 * 1000); // Run every 15 minutes

module.exports = router; 