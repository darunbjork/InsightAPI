// storage.js
// Cloud Storage Abstraction (Placeholder for AWS S3/GCS)

const fs = require('fs/promises');
const path = require('path');
const logger = require('./logger');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');

/**
 * Simulates uploading a file to cloud storage and returns its accessible URL/key.
 * In production, this would use S3/GCS SDK.
 * @param {object} file - The file object provided by Multer.
 * @param {string} destDir - The target sub-directory (e.g., 'avatars/').
 * @returns {string} The public URL/key for the file.
 */
const uploadFileToCloud = async (file, destDir = 'uploads') => {
  // 1. Create a unique file path within the public directory
  const relativePath = path.join(destDir, file.filename);
  const fullPath = path.join(PUBLIC_DIR, relativePath);
  
  // 2. Ensure the destination directory exists
  await fs.mkdir(path.join(PUBLIC_DIR, destDir), { recursive: true });

  // 3. Move the file from its temporary Multer location to the public location
  await fs.rename(file.path, fullPath);

  // 4. Log and return the "public" path (accessible via Express static middleware)
  const fileKey = `/public/${relativePath}`; // The URL path
  
  logger.info({ event: 'storage_upload_success', fileKey });

  // IMPORTANT: For true cloud storage, this would be: 
  // `https://<bucket-name>.s3.<region>.amazonaws.com/${relativePath}`
  return fileKey;
};

/**
 * Simulates deleting a file from cloud storage.
 * In production, this would call the S3/GCS delete API.
 * @param {string} fileKey - The unique key/path of the file (e.g., '/public/avatars/...).
 */
const deleteFileFromCloud = async (fileKey) => {
  // 1. Convert the public URL path back to the local file system path
  if (!fileKey || !fileKey.startsWith('/public/')) {
      logger.warn({ event: 'storage_delete_invalid', fileKey });
      return; // Safety check
  }
  
  // Convert /public/avatars/filename.jpg -> path/to/src/public/avatars/filename.jpg
  const relativePath = fileKey.substring('/public/'.length);
  const fullPath = path.join(PUBLIC_DIR, relativePath);

  try {
    await fs.unlink(fullPath);
    logger.info({ event: 'storage_delete_success', fileKey });
  } catch (error) {
    if (error.code === 'ENOENT') {
        logger.warn({ event: 'storage_delete_missing', fileKey });
    } else {
        logger.error({ event: 'storage_delete_failure', fileKey, error: error.message });
        throw error;
    }
  }
};

module.exports = {
  uploadFileToCloud,
  deleteFileFromCloud,
};
