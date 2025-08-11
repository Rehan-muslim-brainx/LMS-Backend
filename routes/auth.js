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
const otpModel = new OTP();

// Step 1: Register - Send OTP to email
router.post('/register', [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Please include a valid email'),
  body('role').notEmpty().withMessage('Role is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, role } = req.body;

    // Validate role - Only allow non-admin roles for registration
    const allowedRoles = ['project_coordinator', 'associate_project_manager', 'assistant_project_manager', 'principal_software_engineer'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role. Admin role cannot be assigned during registration.' });
    }

    // Check if user already exists
    const emailExists = await userModel.emailExists(email);
    if (emailExists) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Generate and send OTP
    const otp = otpModel.generateOTP();
    await otpModel.createOTP(email, otp, 'registration');
    await emailService.sendOTP(email, otp, 'registration');

    // Store temporary user data in session or cache (for now, we'll send it back)
    res.json({ 
      message: 'OTP sent to your email. Please verify to complete registration.',
      tempUserData: { name, email, role },
      requiresOTP: true
    });

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
  body('role').notEmpty().withMessage('Role is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, otp, name, role } = req.body;

    // Validate role - Only allow non-admin roles for registration
    const allowedRoles = ['project_coordinator', 'associate_project_manager', 'assistant_project_manager', 'principal_software_engineer'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role. Admin role cannot be assigned during registration.' });
    }

    // Verify OTP
    const isValidOTP = await otpModel.verifyOTP(email, otp, 'registration');
    if (!isValidOTP) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    // Create user
    const userData = {
      name,
      email,
      role,
      is_verified: true,
      created_at: new Date().toISOString()
    };

    const user = await userModel.create(userData);

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
    console.error('Verify registration error:', error);
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
      role: user.role
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Cleanup expired OTPs (background job)
setInterval(async () => {
  try {
    await otpModel.cleanupExpiredOTPs();
  } catch (error) {
    console.error('OTP cleanup error:', error);
  }
}, 15 * 60 * 1000); // Run every 15 minutes

module.exports = router; 