const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.user;
    
    // Check if user is blocked (skip for admin)
    if (req.user.role !== 'admin') {
      checkUserStatus(req, res, next);
    } else {
      next();
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Function to check if user is blocked
const checkUserStatus = async (req, res, next) => {
  try {
    const supabase = req.app.locals.supabase;
    if (!supabase) {
      return next(); // Skip check if Supabase not configured
    }
    
    const userModel = new User(supabase);
    const isBlocked = await userModel.isBlocked(req.user.id);
    
    if (isBlocked) {
      return res.status(403).json({ 
        message: 'Your account has been blocked. Please contact an administrator.' 
      });
    }
    
    next();
  } catch (error) {
    console.error('User status check error:', error);
    next(); // Continue on error to avoid breaking auth
  }
};

module.exports = auth; 