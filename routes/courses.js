const express = require('express');
const { body, validationResult } = require('express-validator');
const Course = require('../models/Course');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all courses
router.get('/', async (req, res) => {
  try {
    const supabase = req.app.locals.supabase;
    const courseModel = new Course(supabase);
    
    const courses = await courseModel.getAll();
    res.json(courses);
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get course by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const supabase = req.app.locals.supabase;
    const courseModel = new Course(supabase);
    
    const course = await courseModel.getById(id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    res.json(course);
  } catch (error) {
    console.error('Get course error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create course (instructor/admin only)
router.post('/', [
  auth,
  body('title').notEmpty().withMessage('Title is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('category').notEmpty().withMessage('Category is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Check if user has permission to create courses
    const allowedRoles = ['associate_project_manager', 'assistant_project_manager', 'principal_software_engineer', 'admin'];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { title, description, category, price, duration, image_url, document_url, external_link } = req.body;
    const supabase = req.app.locals.supabase;
    const courseModel = new Course(supabase);

    const courseData = {
      title,
      description,
      category,
      price: price || 0,
      duration: duration || 0,
      image_url: image_url || null,
      document_url: document_url || null,
      external_link: external_link || null,
      instructor_id: req.user.id,
      created_at: new Date().toISOString()
    };

    const course = await courseModel.create(courseData);
    res.status(201).json(course);
  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update course (instructor/admin only)
router.put('/:id', [
  auth,
  body('title').notEmpty().withMessage('Title is required'),
  body('description').notEmpty().withMessage('Description is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const supabase = req.app.locals.supabase;
    const courseModel = new Course(supabase);

    // Get course to check ownership
    const course = await courseModel.getById(id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check if user is the instructor or admin
    if (course.instructor_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const updates = {
      title: req.body.title,
      description: req.body.description,
      category: req.body.category,
      price: req.body.price,
      duration: req.body.duration,
      image_url: req.body.image_url,
      document_url: req.body.document_url,
      external_link: req.body.external_link,
      updated_at: new Date().toISOString()
    };

    const updatedCourse = await courseModel.update(id, updates);
    res.json(updatedCourse);
  } catch (error) {
    console.error('Update course error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete course (instructor/admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const supabase = req.app.locals.supabase;
    const courseModel = new Course(supabase);

    // Get course to check ownership
    const course = await courseModel.getById(id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check if user is the instructor or admin
    if (course.instructor_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    await courseModel.delete(id);
    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    console.error('Delete course error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Search courses
router.get('/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const supabase = req.app.locals.supabase;
    const courseModel = new Course(supabase);
    
    const courses = await courseModel.search(query);
    res.json(courses);
  } catch (error) {
    console.error('Search courses error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get courses by instructor
router.get('/instructor/:instructorId', async (req, res) => {
  try {
    const { instructorId } = req.params;
    const supabase = req.app.locals.supabase;
    const courseModel = new Course(supabase);
    
    const courses = await courseModel.getByInstructor(instructorId);
    res.json(courses);
  } catch (error) {
    console.error('Get instructor courses error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 