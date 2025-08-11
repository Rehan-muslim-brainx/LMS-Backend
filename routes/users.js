const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all users (admin only)
router.get('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const supabase = req.app.locals.supabase;
    const userModel = new User(supabase);
    
    const users = await userModel.getAll();
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const supabase = req.app.locals.supabase;
    const userModel = new User(supabase);
    
    // Users can only view their own profile or admin can view any
    if (req.user.id !== id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const user = await userModel.getById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Remove password from response
    const { password: _, ...userResponse } = user;
    res.json(userResponse);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user profile
router.put('/:id', [
  auth,
  body('name').notEmpty().withMessage('Name is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    
    // Users can only update their own profile or admin can update any
    if (req.user.id !== id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const supabase = req.app.locals.supabase;
    const userModel = new User(supabase);

    // Get user to verify exists
    const user = await userModel.getById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const updates = {
      name: req.body.name,
      bio: req.body.bio,
      avatar_url: req.body.avatar_url,
      updated_at: new Date().toISOString()
    };

    const updatedUser = await userModel.update(id, updates);
    
    // Remove password from response
    const { password: _, ...userResponse } = updatedUser;
    res.json(userResponse);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete user (admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const supabase = req.app.locals.supabase;
    const userModel = new User(supabase);

    // Get user to verify exists
    const user = await userModel.getById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await userModel.delete(id);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Change password
router.put('/:id/password', [
  auth,
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;
    
    // Users can only change their own password
    if (req.user.id !== id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const supabase = req.app.locals.supabase;
    const userModel = new User(supabase);

    // Get user to verify current password
    const user = await userModel.getById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const bcrypt = require('bcryptjs');
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    const updates = {
      password: hashedPassword,
      updated_at: new Date().toISOString()
    };

    await userModel.update(id, updates);
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 