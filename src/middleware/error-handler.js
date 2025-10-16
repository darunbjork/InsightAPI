// error-handler.js
// Global error handling middleware. MUST be the last middleware added to Express.

const logger = require('../utils/logger');
const AppError = require('../utils/AppError');

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  // Log the error using the structured logger
  // Always log the full stack trace for programmer errors
  logger.error({ 
    event: 'server_error', 
    requestId: req.id, 
    message: err.message, 
    stack: err.stack,
    isOperational: err.isOperational || false,
    statusCode: err.statusCode || 500,
  });

  // 1. Differentiate between Operational and Programmer Errors
  
  if (err.isOperational) {
    // Expected errors (e.g., bad request, unauthorized)
    res.status(err.statusCode).json({
      status: 'fail',
      code: err.code,
      message: err.message,
      requestId: req.id,
    });
  } else {
    // UNEXPECTED Programmer Errors (e.g., DB connection lost, coding bug)
    // For security, do NOT leak internal stack traces or details to the client.
    // Send a generic 500 message.
    res.status(500).json({
      status: 'error',
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred.',
      requestId: req.id,
    });

    // In a real production system, you would want to alert an external
    // monitoring system (e.g., Sentry, PagerDuty) for non-operational errors.
    
    // OPTION: Gracefully shut down the process if a critical programmer error occurs
    // process.exit(1); 
  }
};

module.exports = errorHandler;
