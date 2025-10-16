// rate-limiter.js
// Simple fixed-window rate limiting middleware using an in-memory store.

const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

// Store: { ip: [timestamp1, timestamp2, ...] }
// In production, this MUST be Redis for shared memory across instances.
const rateLimitStore = new Map(); 

const MAX_REQUESTS = 100; // Max requests allowed
const WINDOW_MS = 60 * 1000; // 1 minute window

// Middleware factory for general rate limiting
const rateLimiter = (options = {}) => {
  const max = options.max || MAX_REQUESTS;
  const windowMs = options.windowMs || WINDOW_MS;

  return (req, res, next) => {
    // Use the client's IP address (get from header or connection)
    const ip = req.ip; 
    const now = Date.now();

    // 1. Get the timestamps for the current IP
    const requests = rateLimitStore.get(ip) || [];

    // 2. Filter out requests older than the window
    const windowStart = now - windowMs;
    const recentRequests = requests.filter(timestamp => timestamp > windowStart);

    // 3. Check the limit
    if (recentRequests.length >= max) {
      logger.warn({ 
        event: 'rate_limit_exceeded', 
        requestId: req.id, 
        ip: ip, 
        limit: max 
      });
      // 429 Too Many Requests
      const retryAfter = Math.ceil((recentRequests[0] + windowMs - now) / 1000);
      res.setHeader('Retry-After', retryAfter);
      return next(new AppError('Rate limit exceeded. Try again later.', 429, 'RATE_LIMIT_EXCEEDED'));
    }

    // 4. Record the current request
    recentRequests.push(now);
    rateLimitStore.set(ip, recentRequests);
    
    // Set headers for transparency
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', max - recentRequests.length);

    next();
  };
};

module.exports = rateLimiter;
