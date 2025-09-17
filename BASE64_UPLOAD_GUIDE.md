# Base64 Upload Integration Guide

This guide explains how to use the new base64 upload functionality for S3 integration.

## Setup

### 1. Install Dependencies

```bash
npm install aws-sdk
```

### 2. Environment Variables

Add these environment variables to your `.env` file:

```env
# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-s3-bucket-name
```

### 3. AWS S3 Bucket Setup

1. Create an S3 bucket
2. Configure CORS policy for your bucket:
```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
        "AllowedOrigins": ["*"],
        "ExposeHeaders": []
    }
]
```
3. Set bucket permissions to allow public read access for uploaded files

## API Endpoints

### 1. Upload Base64 Data to S3

**Endpoint:** `POST /api/upload/base64`

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "base64Data": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...",
  "fileName": "image.jpg",
  "mimeType": "image/jpeg",
  "folder": "uploads" // optional, defaults to 'uploads'
}
```

**Response:**
```json
{
  "message": "File uploaded to S3 successfully",
  "url": "https://your-bucket.s3.amazonaws.com/uploads/1234567890-abcdef12.jpg",
  "key": "uploads/1234567890-abcdef12.jpg",
  "fileName": "1234567890-abcdef12.jpg",
  "originalName": "image.jpg",
  "size": 12345,
  "mimeType": "image/jpeg"
}
```

### 2. Create Course with Base64 Data

**Endpoint:** `POST /api/courses`

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body (New File Object Structure):**
```json
{
  "title": "Course Title",
  "description": "Course Description",
  "category": "Technical",
  "department": "MERN Stack",
  "price": 0,
  "duration": 20,
  "external_link": "",
  "quiz_link": "https://example.com/quiz",
  
  // Image file object (optional)
  "image_file": {
    "base64": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...",
    "fileName": "course-image.jpg",
    "fileType": "image/jpeg"
  },
  
  // Document file object (optional)
  "document_file": {
    "base64": "data:application/pdf;base64,JVBERi0xLjQKJcfs...",
    "fileName": "course-document.pdf",
    "fileType": "application/pdf"
  }
}
```

**Response:**
```json
{
  "id": "course-id",
  "title": "Course Title",
  "description": "Course Description",
  "category": "Technical",
  "department": "MERN Stack",
  "price": 0,
  "duration": 20,
  "image_url": "http://localhost:5000/uploads/courses/images/1234567890-abcdef12.jpg",
  "document_url": "http://localhost:5000/uploads/courses/documents/1234567890-abcdef12.pdf",
  "external_link": "",
  "quiz_link": "https://example.com/quiz",
  "instructor_id": "instructor-id",
  "created_at": "2025-09-16T13:06:19.785+00:00",
  "is_active": true
}
```

## Frontend Integration

### JavaScript Example

```javascript
// Convert file to base64
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
}

// Upload file to S3
async function uploadToS3(file, folder = 'uploads') {
  try {
    const base64Data = await fileToBase64(file);
    
    const response = await fetch('/api/upload/base64', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        base64Data: base64Data,
        fileName: file.name,
        mimeType: file.type,
        folder: folder
      })
    });
    
    const result = await response.json();
    return result.url; // S3 URL
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
}

// Create course with base64 data (New File Object Structure)
async function createCourse(courseData, imageFile, documentFile) {
  try {
    const payload = { ...courseData };
    
    // Handle image file
    if (imageFile) {
      const imageBase64 = await fileToBase64(imageFile);
      payload.image_file = {
        base64: imageBase64,
        fileName: imageFile.name,
        fileType: imageFile.type
      };
    }
    
    // Handle document file
    if (documentFile) {
      const documentBase64 = await fileToBase64(documentFile);
      payload.document_file = {
        base64: documentBase64,
        fileName: documentFile.name,
        fileType: documentFile.type
      };
    }
    
    const response = await fetch('/api/courses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Course creation failed');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Course creation error:', error);
    throw error;
  }
}
```

### React Example

```jsx
import React, { useState } from 'react';

function CourseForm() {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    department: '',
    price: 0,
    duration: 0
  });
  const [imageFile, setImageFile] = useState(null);
  const [documentFile, setDocumentFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const result = await createCourse(formData, imageFile, documentFile);
      console.log('Course created:', result);
      // Handle success
    } catch (error) {
      console.error('Error:', error);
      // Handle error
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <input
        type="file"
        accept="image/*"
        onChange={(e) => setImageFile(e.target.files[0])}
      />
      <input
        type="file"
        accept=".pdf,.doc,.docx"
        onChange={(e) => setDocumentFile(e.target.files[0])}
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create Course'}
      </button>
    </form>
  );
}
```

## File Size Limits

- Maximum file size: 10MB
- Supported image formats: JPEG, PNG, GIF, WebP
- Supported document formats: PDF, DOC, DOCX, PPT, PPTX, TXT

## Error Handling

The API returns appropriate error messages for:
- Invalid base64 data
- File size exceeding limits
- Missing required fields
- S3 upload failures
- Authentication errors

## Security Notes

1. Files are uploaded with public read access
2. File names are randomized to prevent conflicts
3. File types are validated based on MIME type
4. Authentication is required for all upload operations
5. Only admin and specific roles can upload files
