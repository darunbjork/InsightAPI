// auth.middleware.js
// Middleware to authenticate the request using the short-lived access token cookie.

const jwt = require('jsonwebtoken');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const config = require('../config/config');

// Middleware to protect routes
const authenticate = (req, res, next) => {
  // 1. Extract the token from the HttpOnly cookie
  const token = req.cookies.accessToken;

  if (!token) {
    // If no token, request is unauthorized. Tell client to re-authenticate or refresh.
    return next(new AppError('Authentication failed: No access token provided.', 401, 'AUTH_REQUIRED'));
  }

  try {
    // 2. Verify the token using the secret
    // This synchronously throws an error if the token is invalid or expired.
    const decoded = jwt.verify(token, config.jwt.secretAccess);
    
    // 3. Attach user payload to the request for downstream middleware/controllers
    // This assumes the token payload includes id and username from auth.service.js
    req.user = {
      id: decoded.id,
      username: decoded.username,
      // NOTE: In Phase 2/3, we might fetch the full user from DB here to ensure account is still active/not banned.
    };

    logger.debug({ 
      event: 'user_authenticated', 
      requestId: req.id, 
      userId: req.user.id 
    });

    next();
  } catch (error) {
    // 4. Handle token verification failure
    
    // Log the actual JWT error for debugging
    logger.error({ 
      event: 'auth_token_error', 
      requestId: req.id, 
      error: error.message 
    });
    
    let message = 'Invalid or expired token.';
    let code = 'AUTH_FAILED';

    if (error.name === 'TokenExpiredError') {
      // Specifically inform the client that they need to use the refresh flow
      message = 'Access token expired. Please refresh.';
      code = 'AUTH_TOKEN_EXPIRED';
    } 
    
    // IMPORTANT: Clear the expired cookie to prompt client to refresh
    res.clearCookie('accessToken');

    return next(new AppError(message, 401, code));
  }
};

module.exports = authenticate;
