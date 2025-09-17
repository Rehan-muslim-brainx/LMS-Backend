// S3 utility functions for handling base64 uploads
const AWS = require('aws-sdk');
const crypto = require('crypto');

// Configure AWS S3 (using your updated environment variables)
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_DEFAULT_REGION || 'ap-southeast-1'
});

const BUCKET_NAME = process.env.AWS_BUCKET || 'brainx-dev';

/**
 * Upload base64 data to S3
 * @param {string} base64Data - Base64 encoded file data
 * @param {string} fileName - Original file name
 * @param {string} mimeType - MIME type of the file
 * @param {string} folder - S3 folder path (optional)
 * @returns {Promise<Object>} - S3 upload result with URL
 */
async function uploadBase64ToS3(base64Data, fileName, mimeType, folder = 'uploads') {
  try {
    // Check if S3 is properly configured
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !process.env.AWS_BUCKET) {
      throw new Error('S3 not configured. Please check your AWS credentials in .env file');
    }

    // Remove data URL prefix if present (e.g., "data:image/jpeg;base64,")
    const base64String = base64Data.replace(/^data:[^;]+;base64,/, '');
    
    // Convert base64 to buffer
    const buffer = Buffer.from(base64String, 'base64');
    
    // Generate unique filename
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(8).toString('hex');
    const fileExtension = getFileExtension(fileName, mimeType);
    const uniqueFileName = `${timestamp}-${randomString}${fileExtension}`;
    
    // S3 key (path in bucket)
    const s3Key = `${folder}/${uniqueFileName}`;
    
    // Sanitize filename for metadata (remove/replace invalid characters)
    const sanitizedFileName = fileName.replace(/[^\x20-\x7E]/g, '').replace(/[^\w\s.-]/g, '_');
    
    // Upload parameters
    const uploadParams = {
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: buffer,
      ContentType: mimeType,
      ACL: 'public-read', // Make file publicly accessible
      Metadata: {
        originalName: sanitizedFileName,
        uploadedAt: new Date().toISOString()
      }
    };
    
    // Upload to S3
    const result = await s3.upload(uploadParams).promise();
    
    return {
      success: true,
      url: result.Location,
      key: s3Key,
      fileName: uniqueFileName,
      originalName: fileName,
      size: buffer.length,
      mimeType: mimeType
    };
    
  } catch (error) {
    console.error('S3 upload error:', error);
    
    // If S3 fails, fall back to local storage for development
    if (error.code === 'InvalidAccessKeyId' || error.message.includes('not configured') || error.message.includes('InvalidAccessKeyId')) {
      console.log('⚠️  S3 not available, falling back to local storage...');
      return await uploadBase64ToLocal(base64Data, fileName, mimeType, folder);
    }
    
    throw new Error(`Failed to upload file to S3: ${error.message}`);
  }
}

/**
 * Fallback: Upload base64 data to local storage
 * @param {string} base64Data - Base64 encoded file data
 * @param {string} fileName - Original file name
 * @param {string} mimeType - MIME type of the file
 * @param {string} folder - Local folder path (optional)
 * @returns {Promise<Object>} - Local upload result with URL
 */
async function uploadBase64ToLocal(base64Data, fileName, mimeType, folder = 'uploads') {
  const fs = require('fs');
  const path = require('path');
  
  try {
    // Remove data URL prefix if present
    const base64String = base64Data.replace(/^data:[^;]+;base64,/, '');
    
    // Convert base64 to buffer
    const buffer = Buffer.from(base64String, 'base64');
    
    // Generate unique filename
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(8).toString('hex');
    const fileExtension = getFileExtension(fileName, mimeType);
    const uniqueFileName = `${timestamp}-${randomString}${fileExtension}`;
    
    // Create local directory if it doesn't exist
    const localDir = path.join(__dirname, '..', 'uploads', folder);
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
    
    // Save file locally
    const filePath = path.join(localDir, uniqueFileName);
    fs.writeFileSync(filePath, buffer);
    
    // Return local URL
    const localUrl = `http://localhost:5000/uploads/${folder}/${uniqueFileName}`;
    
    return {
      success: true,
      url: localUrl,
      key: `${folder}/${uniqueFileName}`,
      fileName: uniqueFileName,
      originalName: fileName,
      size: buffer.length,
      mimeType: mimeType,
      local: true // Flag to indicate this is local storage
    };
    
  } catch (error) {
    console.error('Local upload error:', error);
    throw new Error(`Failed to upload file locally: ${error.message}`);
  }
}

/**
 * Delete file from S3
 * @param {string} s3Key - S3 key (path) of the file to delete
 * @returns {Promise<boolean>} - Success status
 */
async function deleteFromS3(s3Key) {
  try {
    const deleteParams = {
      Bucket: BUCKET_NAME,
      Key: s3Key
    };
    
    await s3.deleteObject(deleteParams).promise();
    return true;
  } catch (error) {
    console.error('S3 delete error:', error);
    throw new Error(`Failed to delete file from S3: ${error.message}`);
  }
}

/**
 * Get file extension from filename or MIME type
 * @param {string} fileName - Original file name
 * @param {string} mimeType - MIME type
 * @returns {string} - File extension with dot
 */
function getFileExtension(fileName, mimeType) {
  // Try to get extension from filename first
  if (fileName && fileName.includes('.')) {
    return '.' + fileName.split('.').pop().toLowerCase();
  }
  
  // Fallback to MIME type mapping
  const mimeToExt = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'application/pdf': '.pdf',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/vnd.ms-powerpoint': '.ppt',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
    'text/plain': '.txt',
    'application/zip': '.zip',
    'application/x-zip-compressed': '.zip'
  };
  
  return mimeToExt[mimeType] || '.bin';
}

/**
 * Validate base64 data
 * @param {string} base64Data - Base64 string to validate
 * @returns {boolean} - Whether the base64 data is valid
 */
function validateBase64(base64Data) {
  if (!base64Data || typeof base64Data !== 'string') {
    return false;
  }
  
  // Check if it's a data URL or pure base64
  const base64String = base64Data.replace(/^data:[^;]+;base64,/, '');
  
  // Basic base64 validation
  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
  return base64Regex.test(base64String) && base64String.length > 0;
}

/**
 * Get file size from base64 data
 * @param {string} base64Data - Base64 string
 * @returns {number} - File size in bytes
 */
function getBase64FileSize(base64Data) {
  const base64String = base64Data.replace(/^data:[^;]+;base64,/, '');
  return Math.floor((base64String.length * 3) / 4);
}

/**
 * Validate file object structure
 * @param {Object} fileData - File object with base64, fileName, fileType
 * @param {string} fileType - Type of file (image, document, etc.)
 * @returns {Object} - Validation result
 */
function validateFileObject(fileData, fileType = 'file') {
  if (!fileData) {
    return { valid: false, error: `No ${fileType} data provided` };
  }

  if (!fileData.base64) {
    return { valid: false, error: `Missing base64 data for ${fileType}` };
  }

  if (!fileData.fileName) {
    return { valid: false, error: `Missing fileName for ${fileType}` };
  }

  if (!fileData.fileType) {
    return { valid: false, error: `Missing fileType for ${fileType}` };
  }

  if (!validateBase64(fileData.base64)) {
    return { valid: false, error: `Invalid base64 data for ${fileType}` };
  }

  const fileSize = getBase64FileSize(fileData.base64);
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (fileSize > maxSize) {
    return { 
      valid: false, 
      error: `${fileType} too large. Maximum size is ${maxSize / (1024 * 1024)}MB` 
    };
  }

  return { valid: true, fileSize };
}

/**
 * Process and upload file object to S3
 * @param {Object} fileData - File object with base64, fileName, fileType
 * @param {string} folder - S3 folder path
 * @param {string} fileType - Type of file for logging
 * @returns {Promise<string|null>} - S3 URL or null if no file
 */
async function processFileUpload(fileData, folder, fileType = 'file') {
  if (!fileData) {
    return null;
  }

  const validation = validateFileObject(fileData, fileType);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  console.log(`📤 Processing ${fileType} upload:`, {
    fileName: fileData.fileName,
    fileType: fileData.fileType,
    size: validation.fileSize,
    folder
  });

  try {
    const result = await uploadBase64ToS3(
      fileData.base64,
      fileData.fileName,
      fileData.fileType,
      folder
    );

    console.log(`✅ ${fileType} uploaded successfully:`, result.url);
    return result.url;
  } catch (error) {
    console.error(`❌ ${fileType} upload failed:`, error.message);
    throw new Error(`Failed to upload ${fileType}: ${error.message}`);
  }
}

module.exports = {
  uploadBase64ToS3,
  deleteFromS3,
  getFileExtension,
  validateBase64,
  getBase64FileSize,
  validateFileObject,
  processFileUpload
};
