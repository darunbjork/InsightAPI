// storage.js
// Cloud Storage Abstraction for Cloudflare R2

const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

// --- R2 Configuration ---
const { R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ACCOUNT_ID, R2_BUCKET_NAME, R2_PUBLIC_URL } = process.env;

if (!R2_ACCOUNT_ID || !R2_BUCKET_NAME) {
  logger.warn('Cloudflare R2 environment variables are not fully set. File uploads will not work in production.');
}

const s3 = new AWS.S3({
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  accessKeyId: R2_ACCESS_KEY_ID,
  secretAccessKey: R2_SECRET_ACCESS_KEY,
  signatureVersion: 'v4',
  region: 'auto', // R2 is region-less
});

/**
 * Uploads a file to a Cloudflare R2 bucket and returns its public URL.
 * @param {object} file - The file object provided by Multer.
 * @param {string} destDir - The target sub-directory (e.g., 'avatars/').
 * @returns {string} The public URL for the file.
 */
const uploadFileToCloud = async (file, destDir = 'uploads') => {
  if (!R2_BUCKET_NAME || !R2_PUBLIC_URL) {
    throw new Error('R2 bucket name or public URL is not configured.');
  }

  const fileStream = fs.createReadStream(file.path);
  const s3Key = path.join(destDir, file.filename);

  const params = {
    Bucket: R2_BUCKET_NAME,
    Key: s3Key,
    Body: fileStream,
    ContentType: file.mimetype,
  };

  try {
    await s3.upload(params).promise();
    await fs.promises.unlink(file.path);

    // Construct the public URL manually
    const publicUrl = `${R2_PUBLIC_URL}/${s3Key}`;

    logger.info({ event: 'storage_upload_success', fileKey: s3Key, location: publicUrl });

    return publicUrl;
  } catch (error) {
    await fs.promises.unlink(file.path);
    logger.error({ event: 'storage_upload_failure', error: error.message });
    throw error;
  }
};

/**
 * Deletes a file from a Cloudflare R2 bucket.
 * @param {string} fileUrl - The public URL of the file in R2.
 */
const deleteFileFromCloud = async (fileUrl) => {
  if (!R2_BUCKET_NAME || !fileUrl || !R2_PUBLIC_URL) {
    return;
  }

  try {
    // Extract the S3 key from the full public URL
    const s3Key = fileUrl.replace(R2_PUBLIC_URL + '/', '');

    const params = {
      Bucket: R2_BUCKET_NAME,
      Key: s3Key,
    };

    await s3.deleteObject(params).promise();

    logger.info({ event: 'storage_delete_success', fileKey: s3Key });
  } catch (error) {
    logger.error({ event: 'storage_delete_failure', fileUrl, error: error.message });
  }
};

module.exports = {
  uploadFileToCloud,
  deleteFileFromCloud,
};
