// auth.routes.js
// Express routes for authentication. Should be thin, delegating to the service layer.

const express = require('express');
const authService = require('../services/auth.service');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

const validate = require('../middleware/validate.middleware');
const { register, login } = require('../validation/auth.validation');

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
    path: '/api/v1/auth'
  });
  
  // Refresh Token: Long-lived, HttpOnly, SameSite=Strict
  res.cookie('refreshToken', refreshToken, {
    maxAge: refreshExpiryMs,
    httpOnly: true,
    secure: isProd, 
    sameSite: 'Lax', // More restrictive, better for high-security tokens
    path: '/api/v1/auth' // Restrict to the refresh endpoint only
  });
};

// Helper to clear tokens on logout
const clearAuthCookies = (res) => {
  res.cookie('accessToken', 'loggedout', {
    httpOnly: true,
    expires: new Date(Date.now() + 10 * 1000), // Expire in 10s
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
    path: '/api/v1/auth'
  });
  res.cookie('refreshToken', 'loggedout', {
    httpOnly: true,
    expires: new Date(Date.now() + 10 * 1000), 
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
    path: '/api/v1/auth',
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

module.exports = router;
