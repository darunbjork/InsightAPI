// error-handler.js (UPDATED)
// Global error handling middleware.

const logger = require('../utils/logger');
const AppError = require('../utils/AppError');

// --- Error Helper Functions to Transform External Errors ---

// Problem: MongoDB Duplicate Key Error (code 11000)
// Solution: Transform into a 409 Conflict AppError.
const handleDuplicateFieldsDB = err => {
  // Extract the duplicated field name from the error message (e.g., "email: test@example.com")
  const value = err.errmsg.match(/(['"])(\?.)*?\1/)[0];
  const message = `Duplicate field value: ${value}. Please use another value.`;
  // 409 Conflict: The request could not be completed due to a conflict with the current state of the target resource.
  return new AppError(message, 409, 'DUPLICATE_RESOURCE');
};

// Problem: Mongoose Validation Error (e.g., missing required field)
// Solution: Extract all validation messages and consolidate into a 400 Bad Request AppError.
const handleValidationErrorDB = err => {
  // Loop through all validation errors and extract the message
  const errors = Object.values(err.errors).map(el => el.message);
  const message = `Invalid input data: ${errors.join('. ')}`;
  // 400 Bad Request
  return new AppError(message, 400, 'INVALID_INPUT_DATA');
};

// Problem: Mongoose Invalid ID format (e.g., '/posts/123' where '123' is not an ObjectId)
// Solution: Transform into a 400 Bad Request AppError.
const handleCastErrorDB = err => {
  const message = `Invalid ${err.path}: ${err.value}.`;
  // 400 Bad Request
  return new AppError(message, 400, 'INVALID_ID_FORMAT');
};

// --- Global Error Handler Middleware ---

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  // Use the existing request ID in the error log
  const requestId = req.id || 'N/A';
  
  // Start with a generic error object
  let error = { ...err,
    message: err.message
  };

  // 1. Convert specific non-operational errors into operational AppErrors
  if (err.name === 'CastError') error = handleCastErrorDB(error);
  if (err.name === 'ValidationError') error = handleValidationErrorDB(error);
  if (err.code === 11000) error = handleDuplicateFieldsDB(error);
  if (err.name === 'JsonWebTokenError') {
    error = new AppError('Invalid token. Please log in again.', 401, 'AUTH_INVALID_TOKEN');
  }
  
  // 2. Determine final status code and message
  const statusCode = error.statusCode || 500;
  const status = statusCode.toString().startsWith('4') ? 'fail' : 'error';
  const isOperational = error.isOperational || false;
  
  // 3. Structured Logging
  logger.error({ 
    event: 'server_error', 
    requestId, // CRITICAL: Logging every error with the Request ID
    message: error.message, 
    stack: isOperational && process.env.NODE_ENV === 'development' ? error.stack : undefined,
    // Only log the full stack for programmer errors or in dev mode for operational errors
    isOperational,
    statusCode,
  });

  // 4. Send Response
  if (isOperational) {
    // Expected errors (e.g., bad request, unauthorized)
    res.status(statusCode).json({
      status,
      code: error.code || 'GENERIC_ERROR',
      message: error.message,
      requestId,
    });
  } else {
    // UNEXPECTED Programmer Errors (e.g., DB connection lost, coding bug)
    // Send generic 500 for security, regardless of environment
    res.status(500).json({
      status: 'error',
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred.',
      requestId,
    });
    // In a production system, an UNEXPECTED error should trigger external alerting.
  }
};

module.exports = errorHandler;