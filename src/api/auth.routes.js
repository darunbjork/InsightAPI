// auth.routes.js
// Express routes for authentication. Should be thin, delegating to the service layer.

const express = require('express');
const authService = require('../services/auth.service');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

const validate = require('../middleware/validate.middleware');
const authenticate = require('../middleware/auth.middleware');
const uploadAvatar = require('../middleware/upload.middleware');
const storageUtils = require('../utils/storage'); // To handle cleanup
const { register, login, updateProfile } = require('../validation/auth.validation');

const router = express.Router();

// Helper to set tokens as secure HttpOnly cookies
const setAuthCookies = (res, accessToken, refreshToken) => {
  const isProd = process.env.NODE_ENV === 'production';
  const accessExpiryMs = 15 * 60 * 1000; // 15 minutes
  const refreshExpiryMs = 7 * 24 * 60 * 60 * 1000; // 7 days

  // Access Token: Short-lived, HttpOnly, SameSite=Strict/Lax
  res.cookie('accessToken', accessToken, {
    maxAge: accessExpiryMs,
    httpOnly: true, // Crucial for XSS defense
    secure: isProd, // Must be true in production (requires HTTPS)
    sameSite: 'Lax', // Good balance for initial setup
    path: '/api/v1'
  });
  
  // Refresh Token: Long-lived, HttpOnly, SameSite=Strict
  res.cookie('refreshToken', refreshToken, {
    maxAge: refreshExpiryMs,
    httpOnly: true,
    secure: isProd, 
    sameSite: 'Lax', // More restrictive, better for high-security tokens
    path: '/api/v1' // Restrict to the refresh endpoint only
  });
};

// Helper to clear tokens on logout
const clearAuthCookies = (res) => {
  res.cookie('accessToken', 'loggedout', {
    httpOnly: true,
    expires: new Date(Date.now() + 10 * 1000), // Expire in 10s
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
    path: '/api/v1'
  });
  res.cookie('refreshToken', 'loggedout', {
    httpOnly: true,
    expires: new Date(Date.now() + 10 * 1000), 
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
    path: '/api/v1',
  });
};

// POST /api/v1/auth/register
router.post('/register', validate(register), async (req, res, next) => {
  try {
    const { username, email, password } = req.body;
    
    const { user, accessToken, refreshToken } = await authService.registerUser({ username, email, password });

    setAuthCookies(res, accessToken, refreshToken);
    
    logger.info({ event: 'user_registered', requestId: req.id, userId: user._id });

    // Respond with minimal user data, exclude sensitive fields
    res.status(201).json({ 
      status: 'success', 
      user: { id: user._id, username: user.username, email: user.email } 
    });
  } catch (error) {
    next(error); // Pass to global error handler
  }
});

// POST /api/v1/auth/login
router.post('/login', validate(login), async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const { user, accessToken, refreshToken } = await authService.loginUser({ email, password });

    setAuthCookies(res, accessToken, refreshToken);
    
    logger.info({ event: 'user_logged_in', requestId: req.id, userId: user._id });

    res.status(200).json({ 
      status: 'success', 
      user: { id: user._id, username: user.username, email: user.email } 
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/auth/refresh
router.get('/refresh', async (req, res, next) => {
  try {
    logger.info({ event: 'refresh_cookies', requestId: req.id, cookies: req.cookies });
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      throw new AppError('No refresh token provided.', 401, 'AUTH_NO_TOKEN');
    }

    const { user, accessToken, refreshToken: newRefreshToken } = await authService.refreshAuthTokens(refreshToken);

    setAuthCookies(res, accessToken, newRefreshToken);
    
    logger.info({ event: 'token_refreshed', requestId: req.id, userId: user._id });

    res.status(200).json({ 
      status: 'success', 
      message: 'Access token refreshed.'
    });

  } catch (error) {
    // If refresh fails, it's a critical auth issue, clear all cookies.
    clearAuthCookies(res);
    // Wrap JWT errors as AppError
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return next(new AppError('Invalid or expired refresh token. Please log in.', 401, 'AUTH_REFRESH_FAILED'));
    }
    next(error);
  }
});

// POST /api/v1/auth/logout
router.post('/logout', async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    // Attempt to revoke the token's JTI
    await authService.logoutUser(refreshToken); 
    
    clearAuthCookies(res);
    
    logger.info({ event: 'user_logged_out', requestId: req.id });

    res.status(200).json({ 
      status: 'success', 
      message: 'Logged out successfully.' 
    });
  } catch (error) {
    // Even if revocation fails, we still want to clear the client cookies
    clearAuthCookies(res);
    next(error);
  }
});

// NEW: PUT /api/v1/auth/profile - Update user profile
// Requires authentication and validation
router.put('/profile', authenticate, validate(updateProfile), async (req, res, next) => {
  try {
    const userId = req.user.id;
    // req.body contains the validated fields (username, email)
    const updateBody = req.body; 

    const updatedUser = await authService.updateUserProfile(userId, updateBody);
    
    logger.info({ event: 'user_profile_updated', requestId: req.id, userId });

    res.status(200).json({ 
      status: 'success', 
      message: 'Profile updated successfully.', 
      user: updatedUser 
    });
  } catch (error) {
    next(error);
  }
});

// NEW: PUT /api/v1/auth/avatar - Update user avatar (File Upload)
router.put('/avatar', authenticate, uploadAvatar, async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // 1. Check if the file was successfully uploaded by Multer
    if (!req.file) {
      // If upload failed before Multer calls next(), it handles the error.
      // This is a safety check for a form submission without a file.
      return next(new AppError('No avatar file provided.', 400, 'NO_FILE_PROVIDED'));
    }
    
    // 2. Upload the file to our simulated cloud storage
    // This moves the file from the temp location and gets the public URL/key.
    const newAvatarUrl = await storageUtils.uploadFileToCloud(req.file, 'avatars');
    
    // 3. Update the avatar field in the User model
    const { oldAvatarUrl, updatedUser } = await authService.updateUserAvatar(userId, newAvatarUrl);
    
    // 4. Delete the old avatar from storage (cleanup)
    if (oldAvatarUrl && oldAvatarUrl.startsWith('/public/')) {
      // We only delete if the old URL was a valid local one (i.e., not a default image)
      await storageUtils.deleteFileFromCloud(oldAvatarUrl);
    }

    res.status(200).json({ 
      status: 'success', 
      message: 'Avatar updated.', 
      avatarUrl: updatedUser.avatar 
    });
  } catch (error) {
    // If we catch an error, the file is still in the temp directory.
    // In a real system, you'd add a final cleanup middleware to remove req.file 
    // from /temp/ on all requests, success or fail.
    next(error);
  }
});

module.exports = router;