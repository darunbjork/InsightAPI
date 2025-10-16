// logger.js
// Structured logging utility using console.log/error
// In production, this would use a dedicated library like winston/pino
// and transport to an external system like Elastic Stack or DataDog.

const logger = {
  // Logs a structured JSON object
  log: (level, data) => {
    // Add timestamp and environment info
    const logEntry = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      ...data,
      level,
    };

    // Use console.log for 'info' and 'warn', console.error for 'error'
    if (level === 'error') {
      console.error(JSON.stringify(logEntry));
    } else {
      console.log(JSON.stringify(logEntry));
    }
  },

  info: (data) => logger.log('info', data),
  warn: (data) => logger.log('warn', data),
  error: (data) => logger.log('error', data),
  
  // Special function for debugging during development
  debug: (data) => {
    if (process.env.NODE_ENV === 'development') {
      logger.log('debug', data);
    }
  }
};

module.exports = logger;
