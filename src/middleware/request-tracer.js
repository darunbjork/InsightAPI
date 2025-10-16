// request-tracer.js
// Middleware to assign a unique request ID to every incoming request.
// This is essential for tracing a request end-to-end through logs.

const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

const requestTracer = (req, res, next) => {
  // Use a provided ID from a client/upstream service if available, otherwise generate a new one.
  // Using a custom header like 'X-Client-Request-ID' can be useful.
  const requestId = req.headers['x-request-id'] || uuidv4();
  
  // Attach to the request object for use in services and controllers
  req.id = requestId;
  
  // Set in the response header for clients to use when reporting errors
  res.setHeader('X-Request-ID', requestId);
  
  // Log the incoming request
  logger.info({ 
    event: 'request_start', 
    requestId: req.id, 
    method: req.method, 
    url: req.originalUrl,
    ip: req.ip 
  });

  // Log the response completion
  res.on('finish', () => {
    logger.info({
      event: 'request_complete',
      requestId: req.id,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      // Calculate response time (in a real app, use a dedicated metric library)
      responseTimeMs: new Date().getTime() - req.startTime, 
    });
  });

  // Store start time for basic response time calculation
  req.startTime = new Date().getTime();

  next();
};

module.exports = requestTracer;
