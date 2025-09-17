const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/auth');
const { uploadBase64ToS3, validateBase64, getBase64FileSize } = require('../utils/s3Utils');

const router = express.Router();

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Allow only specific file types
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/gif'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, DOC, DOCX, PPT, PPTX, TXT, and image files are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Upload base64 data to S3 endpoint
router.post('/base64', auth, async (req, res) => {
  try {
    // Check if user is admin or has permission to upload
    const allowedRoles = ['admin', 'associate_project_manager', 'assistant_project_manager', 'principal_software_engineer'];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { base64Data, fileName, mimeType, folder } = req.body;

    // Validate required fields
    if (!base64Data || !fileName || !mimeType) {
      return res.status(400).json({ 
        message: 'Missing required fields: base64Data, fileName, mimeType' 
      });
    }

    // Validate base64 data
    if (!validateBase64(base64Data)) {
      return res.status(400).json({ message: 'Invalid base64 data' });
    }

    // Check file size (10MB limit)
    const fileSize = getBase64FileSize(base64Data);
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (fileSize > maxSize) {
      return res.status(400).json({ 
        message: `File too large. Maximum size is ${maxSize / (1024 * 1024)}MB` 
      });
    }

    // Upload to S3
    const result = await uploadBase64ToS3(base64Data, fileName, mimeType, folder);
    
    res.json({
      message: 'File uploaded to S3 successfully',
      url: result.url,
      key: result.key,
      fileName: result.fileName,
      originalName: result.originalName,
      size: result.size,
      mimeType: result.mimeType
    });

  } catch (error) {
    console.error('Base64 upload error:', error);
    res.status(500).json({ 
      message: 'Error uploading file to S3',
      error: error.message 
    });
  }
});

// Upload document endpoint (legacy - for direct file uploads)
router.post('/', auth, upload.single('file'), async (req, res) => {
  try {
    // Check if user is admin or has permission to upload
    const allowedRoles = ['admin', 'associate_project_manager', 'assistant_project_manager', 'principal_software_engineer'];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Return file information
    const fileUrl = `/uploads/${req.file.filename}`;
    
    res.json({
      message: 'File uploaded successfully',
      url: fileUrl,
      originalName: req.file.originalname,
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Error uploading file' });
  }
});

// Get uploaded file
router.get('/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(uploadsDir, filename);
    const { view } = req.query; // Check if view=inline is requested

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Get file extension to determine content type
    const ext = path.extname(filename).toLowerCase();
    
    // Set appropriate headers for viewing documents online
    if (ext === '.pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename="' + filename + '"');
      res.setHeader('Cache-Control', 'no-cache');
    } else if (ext === '.doc' || ext === '.docx') {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', 'inline; filename="' + filename + '"');
      res.setHeader('Cache-Control', 'no-cache');
    } else if (ext === '.ppt' || ext === '.pptx') {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
      res.setHeader('Content-Disposition', 'inline; filename="' + filename + '"');
      res.setHeader('Cache-Control', 'no-cache');
    } else if (ext === '.txt') {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', 'inline; filename="' + filename + '"');
      res.setHeader('Cache-Control', 'no-cache');
    } else {
      // For other file types, check if view=inline is requested
      if (view === 'inline') {
        res.setHeader('Content-Disposition', 'inline; filename="' + filename + '"');
      } else {
        res.setHeader('Content-Disposition', 'attachment; filename="' + filename + '"');
      }
    }

    // Send file
    res.sendFile(filePath);
  } catch (error) {
    console.error('File retrieval error:', error);
    res.status(500).json({ message: 'Error retrieving file' });
  }
});

// Delete uploaded file (admin only)
router.delete('/:filename', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const filename = req.params.filename;
    const filePath = path.join(uploadsDir, filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Delete file
    fs.unlinkSync(filePath);

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('File deletion error:', error);
    res.status(500).json({ message: 'Error deleting file' });
  }
});

module.exports = router; 