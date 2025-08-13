const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const Department = require('../models/Department');

// Get all departments
router.get('/', async (req, res) => {
  try {
    console.log('🏢 Departments GET request received');
    const supabase = req.app.locals.supabase;
    
    if (!supabase) {
      console.error('❌ Supabase client not available');
      return res.status(500).json({ message: 'Database connection not available' });
    }
    
    console.log('✅ Supabase client available, creating Department model');
    const departmentModel = new Department(supabase);
    
    console.log('📊 Fetching departments from database...');
    const departments = await departmentModel.getAll();
    
    console.log('✅ Departments fetched successfully:', departments?.length || 0, 'departments');
    res.json(departments);
  } catch (error) {
    console.error('❌ Get departments error:', error);
    res.status(500).json({ 
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Create department (Admin only)
router.post('/', [
  auth,
  body('name').notEmpty().withMessage('Department name is required'),
  body('roles').isArray().withMessage('Roles must be an array'),
  body('roles.*').notEmpty().withMessage('Role names cannot be empty')
], async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, roles, description } = req.body;
    const supabase = req.app.locals.supabase;
    const departmentModel = new Department(supabase);

    // Check if department name already exists
    const existingDepartments = await departmentModel.getAll();
    const nameExists = existingDepartments.some(dept => 
      dept.name.toLowerCase() === name.toLowerCase()
    );

    if (nameExists) {
      return res.status(400).json({ message: 'Department name already exists' });
    }

    const departmentData = {
      name: name.trim(),
      roles: roles.map(role => role.trim()),
      description: description?.trim() || '',
      created_at: new Date().toISOString()
    };

    const department = await departmentModel.create(departmentData);
    res.status(201).json(department);
  } catch (error) {
    console.error('Create department error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update department (Admin only)
router.put('/:id', [
  auth,
  body('name').notEmpty().withMessage('Department name is required'),
  body('roles').isArray().withMessage('Roles must be an array'),
  body('roles.*').notEmpty().withMessage('Role names cannot be empty')
], async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { name, roles, description } = req.body;
    const supabase = req.app.locals.supabase;
    const departmentModel = new Department(supabase);

    // Check if department exists
    const existingDepartment = await departmentModel.getById(id);
    if (!existingDepartment) {
      return res.status(404).json({ message: 'Department not found' });
    }

    // Check if new name conflicts with other departments
    const allDepartments = await departmentModel.getAll();
    const nameExists = allDepartments.some(dept => 
      dept.id !== parseInt(id) && dept.name.toLowerCase() === name.toLowerCase()
    );

    if (nameExists) {
      return res.status(400).json({ message: 'Department name already exists' });
    }

    const departmentData = {
      name: name.trim(),
      roles: roles.map(role => role.trim()),
      description: description?.trim() || '',
      updated_at: new Date().toISOString()
    };

    const department = await departmentModel.update(id, departmentData);
    res.json(department);
  } catch (error) {
    console.error('Update department error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete department (Admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const { id } = req.params;
    const supabase = req.app.locals.supabase;
    const departmentModel = new Department(supabase);

    // Check if department exists
    const existingDepartment = await departmentModel.getById(id);
    if (!existingDepartment) {
      return res.status(404).json({ message: 'Department not found' });
    }

    // Check if department has users
    const { data: users, error } = await supabase
      .from('users')
      .select('id')
      .eq('department', existingDepartment.name);

    if (error) {
      console.error('Error checking users:', error);
      return res.status(500).json({ message: 'Server error' });
    }

    if (users && users.length > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete department with existing users. Please reassign users first.' 
      });
    }

    await departmentModel.delete(id);
    res.json({ message: 'Department deleted successfully' });
  } catch (error) {
    console.error('Delete department error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 