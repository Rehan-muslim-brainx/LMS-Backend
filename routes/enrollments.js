const express = require('express');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');

const router = express.Router();

// Get all enrollments (admin only)
router.get('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const supabase = req.app.locals.supabase;
    const enrollmentModel = new Enrollment(supabase);
    const enrollments = await enrollmentModel.getAll();
    res.json(enrollments);
  } catch (error) {
    console.error('Get enrollments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get course enrollments (instructor/admin only)
router.get('/course/:courseId', auth, async (req, res) => {
  try {
    const { courseId } = req.params;
    const supabase = req.app.locals.supabase;
    const enrollmentModel = new Enrollment(supabase);
    const courseModel = new Course(supabase);

    // Verify course ownership
    const course = await courseModel.getById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (course.instructor_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const enrollments = await enrollmentModel.getByCourse(courseId);
    res.json(enrollments);
  } catch (error) {
    console.error('Get course enrollments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get enrollments pending admin approval (admin only)
router.get('/pending-approval', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const supabase = req.app.locals.supabase;
    const enrollmentModel = new Enrollment(supabase);
    const enrollments = await enrollmentModel.getPendingApproval();
    res.json(enrollments);
  } catch (error) {
    console.error('Get pending approvals error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get completed enrollments (admin only)
router.get('/completed', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const supabase = req.app.locals.supabase;
    const enrollmentModel = new Enrollment(supabase);
    const enrollments = await enrollmentModel.getCompleted();
    res.json(enrollments);
  } catch (error) {
    console.error('Get completed enrollments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Enroll in course
router.post('/', [
  auth,
  body('course_id').notEmpty().withMessage('Course ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { course_id } = req.body;
    const supabase = req.app.locals.supabase;
    const enrollmentModel = new Enrollment(supabase);
    const courseModel = new Course(supabase);

    // Verify course exists
    const course = await courseModel.getById(course_id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check if already enrolled
    const enrollmentStatus = await enrollmentModel.isEnrolled(req.user.id, course_id);
    if (enrollmentStatus.isEnrolled) {
      return res.status(400).json({ message: 'Already enrolled in this course' });
    }

    const enrollmentData = {
      user_id: req.user.id,
      course_id,
      status: 'active',
      enrolled_at: new Date().toISOString()
    };

    const enrollment = await enrollmentModel.create(enrollmentData);
    res.status(201).json(enrollment);
  } catch (error) {
    console.error('Enroll error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Request course completion
router.post('/:enrollmentId/request-completion', [
  auth,
  body('notes').optional().isString().withMessage('Notes must be a string')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { enrollmentId } = req.params;
    const { notes } = req.body;
    const supabase = req.app.locals.supabase;
    const enrollmentModel = new Enrollment(supabase);

    // Get enrollment and verify ownership
    const enrollment = await enrollmentModel.getById(enrollmentId);
    if (!enrollment) {
      return res.status(404).json({ message: 'Enrollment not found' });
    }

    if (enrollment.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (enrollment.status !== 'active') {
      return res.status(400).json({ message: 'Can only request completion for active enrollments' });
    }

    const updatedEnrollment = await enrollmentModel.requestCompletion(enrollmentId, notes);
    res.json(updatedEnrollment);
  } catch (error) {
    console.error('Request completion error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Approve completion (admin only)
router.post('/:enrollmentId/approve', [
  auth,
  body('notes').optional().isString().withMessage('Notes must be a string')
], async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { enrollmentId } = req.params;
    const supabase = req.app.locals.supabase;
    const enrollmentModel = new Enrollment(supabase);

    // Get enrollment
    const enrollment = await enrollmentModel.getById(enrollmentId);
    if (!enrollment) {
      return res.status(404).json({ message: 'Enrollment not found' });
    }

    if (enrollment.status !== 'completion_requested') {
      return res.status(400).json({ message: 'Can only approve completion requests' });
    }

    const updatedEnrollment = await enrollmentModel.approveCompletion(enrollmentId, req.user.id);
    res.json(updatedEnrollment);
  } catch (error) {
    console.error('Approve completion error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reject completion (admin only)
router.post('/:enrollmentId/reject', [
  auth,
  body('notes').optional().isString().withMessage('Notes must be a string')
], async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { enrollmentId } = req.params;
    const { notes } = req.body;
    const supabase = req.app.locals.supabase;
    const enrollmentModel = new Enrollment(supabase);

    // Get enrollment
    const enrollment = await enrollmentModel.getById(enrollmentId);
    if (!enrollment) {
      return res.status(404).json({ message: 'Enrollment not found' });
    }

    if (enrollment.status !== 'completion_requested') {
      return res.status(400).json({ message: 'Can only reject completion requests' });
    }

    const updatedEnrollment = await enrollmentModel.rejectCompletion(enrollmentId, req.user.id, notes);
    res.json(updatedEnrollment);
  } catch (error) {
    console.error('Reject completion error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's enrollments
router.get('/my-enrollments', auth, async (req, res) => {
  try {
    const supabase = req.app.locals.supabase;
    const enrollmentModel = new Enrollment(supabase);
    const enrollments = await enrollmentModel.getByUser(req.user.id);
    res.json(enrollments);
  } catch (error) {
    console.error('Get my enrollments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Check enrollment status
router.get('/check/:courseId', auth, async (req, res) => {
  try {
    const { courseId } = req.params;
    const supabase = req.app.locals.supabase;
    const enrollmentModel = new Enrollment(supabase);

    const enrollmentStatus = await enrollmentModel.isEnrolled(req.user.id, courseId);
    res.json(enrollmentStatus);
  } catch (error) {
    console.error('Check enrollment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update enrollment progress
router.put('/:enrollmentId/progress', [
  auth,
  body('progress').isInt({ min: 0, max: 100 }).withMessage('Progress must be between 0 and 100')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { enrollmentId } = req.params;
    const { progress } = req.body;
    const supabase = req.app.locals.supabase;
    const enrollmentModel = new Enrollment(supabase);

    // Get enrollment and verify ownership
    const enrollment = await enrollmentModel.getById(enrollmentId);
    if (!enrollment) {
      return res.status(404).json({ message: 'Enrollment not found' });
    }

    if (enrollment.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const updatedEnrollment = await enrollmentModel.update(enrollmentId, { progress });
    res.json(updatedEnrollment);
  } catch (error) {
    console.error('Update progress error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete enrollment
router.delete('/:enrollmentId', auth, async (req, res) => {
  try {
    const { enrollmentId } = req.params;
    const supabase = req.app.locals.supabase;
    const enrollmentModel = new Enrollment(supabase);

    // Get enrollment and verify ownership
    const enrollment = await enrollmentModel.getById(enrollmentId);
    if (!enrollment) {
      return res.status(404).json({ message: 'Enrollment not found' });
    }

    if (enrollment.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    await enrollmentModel.delete(enrollmentId);
    res.json({ message: 'Enrollment deleted successfully' });
  } catch (error) {
    console.error('Delete enrollment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 