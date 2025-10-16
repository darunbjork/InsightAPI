// upload.middleware.js
// Multer setup for handling multipart/form-data file uploads.

const multer = require('multer');
const path = require('path');
const AppError = require('../utils/AppError');

// 1. Storage Configuration: Use Multer's disk storage for temporary staging
// Files are saved to a 'temp' directory and then moved by the storage utility.
const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Save to the root 'temp' directory inside the project for staging
    cb(null, path.join(__dirname, '..', '..', 'temp')); 
  },
  filename: (req, file, cb) => {
    // Generate a unique filename: user-ID-timestamp.extension
    const ext = file.mimetype.split('/')[1];
    const filename = `user-${req.user.id}-${Date.now()}.${ext}`;
    cb(null, filename);
  },
});

// 2. File Filter: Restrict accepted file types and ensure it's a single file (not an array)
const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true); // Accept the file
  } else {
    // Reject non-image files
    cb(new AppError('Only image files are allowed for upload.', 400, 'INVALID_FILE_TYPE'), false);
  }
};

// 3. Initialize Multer instance
const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // Limit to 2MB
    files: 1, // Only allow one file per request
  },
});

// 4. Middleware Wrapper: Handles the file upload and moves the result to req.file
// Use .single() for a single file upload, matching the form field name 'avatar'
const uploadAvatar = upload.single('avatar'); 

module.exports = uploadAvatar;
