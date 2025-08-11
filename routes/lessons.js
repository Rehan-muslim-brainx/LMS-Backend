const express = require('express');
const { body, validationResult } = require('express-validator');
const Lesson = require('../models/Lesson');
const Course = require('../models/Course');
const auth = require('../middleware/auth');

const router = express.Router();

// Get lessons by course
router.get('/course/:courseId', async (req, res) => {
  try {
    const { courseId } = req.params;
    const supabase = req.app.locals.supabase;
    const lessonModel = new Lesson(supabase);
    
    const lessons = await lessonModel.getByCourse(courseId);
    res.json(lessons);
  } catch (error) {
    console.error('Get lessons error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get lesson by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const supabase = req.app.locals.supabase;
    const lessonModel = new Lesson(supabase);
    
    const lesson = await lessonModel.getById(id);
    if (!lesson) {
      return res.status(404).json({ message: 'Lesson not found' });
    }
    
    res.json(lesson);
  } catch (error) {
    console.error('Get lesson error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create lesson (instructor/admin only)
router.post('/', [
  auth,
  body('title').notEmpty().withMessage('Title is required'),
  body('content').notEmpty().withMessage('Content is required'),
  body('course_id').notEmpty().withMessage('Course ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Check if user has permission to create lessons
    const allowedRoles = ['associate_project_manager', 'assistant_project_manager', 'principal_software_engineer', 'admin'];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { title, content, course_id, video_url, duration, order_index } = req.body;
    const supabase = req.app.locals.supabase;
    const lessonModel = new Lesson(supabase);
    const courseModel = new Course(supabase);

    // Verify course exists and user owns it
    const course = await courseModel.getById(course_id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (course.instructor_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const lessonData = {
      title,
      content,
      course_id,
      video_url: video_url || null,
      duration: duration || 0,
      order_index: order_index || 1,
      created_at: new Date().toISOString()
    };

    const lesson = await lessonModel.create(lessonData);
    res.status(201).json(lesson);
  } catch (error) {
    console.error('Create lesson error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update lesson (instructor/admin only)
router.put('/:id', [
  auth,
  body('title').notEmpty().withMessage('Title is required'),
  body('content').notEmpty().withMessage('Content is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const supabase = req.app.locals.supabase;
    const lessonModel = new Lesson(supabase);
    const courseModel = new Course(supabase);

    // Get lesson and verify ownership
    const lesson = await lessonModel.getById(id);
    if (!lesson) {
      return res.status(404).json({ message: 'Lesson not found' });
    }

    const course = await courseModel.getById(lesson.course_id);
    if (course.instructor_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const updates = {
      title: req.body.title,
      content: req.body.content,
      video_url: req.body.video_url,
      duration: req.body.duration,
      order_index: req.body.order_index,
      updated_at: new Date().toISOString()
    };

    const updatedLesson = await lessonModel.update(id, updates);
    res.json(updatedLesson);
  } catch (error) {
    console.error('Update lesson error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete lesson (instructor/admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const supabase = req.app.locals.supabase;
    const lessonModel = new Lesson(supabase);
    const courseModel = new Course(supabase);

    // Get lesson and verify ownership
    const lesson = await lessonModel.getById(id);
    if (!lesson) {
      return res.status(404).json({ message: 'Lesson not found' });
    }

    const course = await courseModel.getById(lesson.course_id);
    if (course.instructor_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    await lessonModel.delete(id);
    res.json({ message: 'Lesson deleted successfully' });
  } catch (error) {
    console.error('Delete lesson error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reorder lessons
router.put('/reorder/:courseId', auth, async (req, res) => {
  try {
    const { courseId } = req.params;
    const { lessonIds } = req.body;
    const supabase = req.app.locals.supabase;
    const lessonModel = new Lesson(supabase);
    const courseModel = new Course(supabase);

    // Verify course ownership
    const course = await courseModel.getById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (course.instructor_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    await lessonModel.reorder(courseId, lessonIds);
    res.json({ message: 'Lessons reordered successfully' });
  } catch (error) {
    console.error('Reorder lessons error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 