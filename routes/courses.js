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
    
    // Check if user is authenticated to filter by department
    const authHeader = req.header('Authorization');
    let userDepartment = null;
    let userRole = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userDepartment = decoded.user.department;
        userRole = decoded.user.role;
      } catch (error) {
        // Invalid token, proceed without filtering
      }
    }
    
    let courses;
    const includeInactive = req.query.includeInactive === 'true';
    
    if (userRole === 'admin' || userRole === 'general') {
      // Admin and general role users can see all courses (including inactive if requested)
      courses = await courseModel.getAll(includeInactive);
    } else if (userDepartment) {
      // Regular users see only their department courses (active only)
      courses = await courseModel.getByDepartment(userDepartment);
    } else {
      // Unauthenticated users see all courses (active only)
      courses = await courseModel.getAll(false);
    }
    
    res.json(courses);
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get courses for users (respects activation status and enrollment status)
router.get('/user-courses', auth, async (req, res) => {
  try {
    const supabase = req.app.locals.supabase;
    const courseModel = new Course(supabase);
    const Enrollment = require('../models/Enrollment');
    const enrollmentModel = new Enrollment(supabase);
    
    const userId = req.user.id;
    const userDepartment = req.user.department;
    const userRole = req.user.role;
    
    // Get all courses for user's department (including inactive ones)
    let allCourses;
    if (userRole === 'admin' || userRole === 'general') {
      // Admin users see all courses
      allCourses = await courseModel.getAll(true);
    } else {
      // Get all courses with department filtering (including inactive)
      const { data, error } = await supabase
        .from('courses')
        .select(`
          *,
          instructor:users(name, email),
          lessons:lessons(count)
        `)
        .or(`department.eq.${userDepartment},department.eq.general`)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      allCourses = data;
    }
    
    // Get user's enrollments
    const userEnrollments = await enrollmentModel.getByUser(userId);
    const enrollmentMap = {};
    userEnrollments.forEach(enrollment => {
      enrollmentMap[enrollment.course_id] = enrollment.status;
    });
    
    // Filter courses based on activation status and enrollment status
    const filteredCourses = allCourses.filter(course => {
      // Always show active courses
      if (course.is_active) {
        return true;
      }
      
      // For inactive courses, only show if user has completed them
      const enrollmentStatus = enrollmentMap[course.id];
      return enrollmentStatus === 'completed';
    });
    
    res.json(filteredCourses);
  } catch (error) {
    console.error('Get user courses error:', error);
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
  body('category').notEmpty().withMessage('Category is required'),
  body('department').notEmpty().withMessage('Department is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Check if user has permission to create courses (only admin can create courses)
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Only admin can create courses.' });
    }

    const supabase = req.app.locals.supabase;
    // Validate department
    const { department } = req.body;
    const Department = require('../models/Department');
    const departmentModel = new Department(supabase);
    
    // Get all departments to validate the selected department
    const departments = await departmentModel.getAll();
    const validDepartment = departments.find(dept => dept.name === department);
    
    if (!department || !validDepartment) {
      return res.status(400).json({ message: 'Invalid department. Please select a valid department.' });
    }

    const { title, description, category, price, duration, image_url, document_url, external_link } = req.body;
    const courseModel = new Course(supabase);

    const courseData = {
      title,
      description,
      category,
      department: department || 'General',
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

    // Validate department if provided
    const { department } = req.body;
    if (department) {
      const Department = require('../models/Department');
      const departmentModel = new Department(supabase);
      
      // Get all departments to validate the selected department
      const departments = await departmentModel.getAll();
      const validDepartment = departments.find(dept => dept.name === department);
      
      if (!validDepartment) {
        return res.status(400).json({ message: 'Invalid department. Please select a valid department.' });
      }
    }

    const updates = {
      title: req.body.title,
      description: req.body.description,
      category: req.body.category,
      department: req.body.department,
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

// Activate course (admin only)
router.patch('/:id/activate', auth, async (req, res) => {
  try {
    // Check if user has admin privileges
    if (req.user.role !== 'admin' && req.user.role !== 'general') {
      return res.status(403).json({ message: 'Access denied. Only admin users can activate courses.' });
    }

    const { id } = req.params;
    const supabase = req.app.locals.supabase;
    const courseModel = new Course(supabase);

    const activatedCourse = await courseModel.activate(id);
    res.json({ 
      message: 'Course activated successfully', 
      course: activatedCourse 
    });
  } catch (error) {
    console.error('Activate course error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Deactivate course (admin only)
router.patch('/:id/deactivate', auth, async (req, res) => {
  try {
    // Check if user has admin privileges
    if (req.user.role !== 'admin' && req.user.role !== 'general') {
      return res.status(403).json({ message: 'Access denied. Only admin users can deactivate courses.' });
    }

    const { id } = req.params;
    const supabase = req.app.locals.supabase;
    const courseModel = new Course(supabase);

    const deactivatedCourse = await courseModel.deactivate(id);
    res.json({ 
      message: 'Course deactivated successfully', 
      course: deactivatedCourse 
    });
  } catch (error) {
    console.error('Deactivate course error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 