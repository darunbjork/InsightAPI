// AppError.js
// Custom error class to distinguish operational errors (client-facing) from
// programmer errors (server failure, needs a fix).

class AppError extends Error {
  constructor(message, statusCode, code = 'GENERIC_ERROR') {
    super(message);
    
    // HTTP status code (e.g., 400, 401, 404)
    this.statusCode = statusCode;
    // Custom application error code (e.g., 'AUTH_FAILED', 'POST_NOT_FOUND')
    this.code = code;
    // Operational errors are expected errors like invalid input, failed auth, etc.
    this.isOperational = true;
    
    // Capture the stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
