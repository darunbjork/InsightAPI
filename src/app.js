// app.js
// Express application setup. Separated from server.js for clean testing.

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');

const config = require('./config/config');
const requestTracer = require('./middleware/request-tracer');
const errorHandler = require('./middleware/error-handler');
const AppError = require('./utils/AppError');
const path = require('path'); // Node.js path module
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs'); 

const rateLimiter = require('./middleware/rate-limiter'); 

// Import routes
const authRoutes = require('./api/auth.routes');
const postRoutes = require('./api/post.routes'); 
const commentRoutes = require('./api/comment.routes'); 
const likeRoutes = require('./api/like.routes'); 
const app = express();

// Load the OpenAPI specification file
const swaggerDocument = YAML.load(path.join(__dirname, '..', 'swagger.yaml'));

// --- Production-Grade Middleware ---

// 1. Security Headers (Helmet) - CRITICAL FINAL CONFIGURATION
app.use(helmet({
  // We explicitly disable the default CSP to avoid breaking Swagger UI, 
  // but in a production API without Swagger, you would define a strict CSP.
  contentSecurityPolicy: false,
  // Strict Transport Security (HSTS) - Force HTTPS for a year
  strictTransportSecurity: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  // Referrer Policy: Restrict referrer data
  referrerPolicy: { policy: 'same-origin' }
}));

// 2. CORS: Set up based on environment. 
// In production, MUST whitelist specific frontend origins.
const corsOptions = {
  origin: (origin, callback) => {
    // In development, allow requests with no origin (like server-to-server, Postman)
    if (config.env === 'development' && !origin) {
      return callback(null, true);
    }
    // For now, let's reflect the request's origin. 
    // In a real production scenario, you MUST replace this with a whitelist.
    callback(null, origin);
  }, 
  credentials: true, // Crucial for sending/receiving cookies (including HttpOnly)
};
app.use(cors(corsOptions));

// 3. Request Tracer: Generate a unique ID for every request.
app.use(requestTracer);

// 4. Logging: Using morgan for standard HTTP access logs.
// Combined with our custom logger, this provides good visibility.
app.use(morgan('dev'));

// 5. Body Parsers: Read JSON and URL-encoded bodies.
app.use(express.json({ limit: '10kb' })); // Limit body size to prevent DoS
app.use(express.urlencoded({ extended: true, limit: '10kb' })); 

// 6. Cookie Parser: Required to read the HttpOnly cookies.
app.use(cookieParser());

// CRITICAL: Serve Static Files (Avatars, defaults, etc.)
// Maps '/public' URL prefix to the physical 'src/public' directory
app.use('/public', express.static(path.join(__dirname, 'public'))); 

// 7. General Rate Limiting: Apply to all incoming requests
// 100 requests per minute per IP is a good, generous starting point.
app.use(rateLimiter({ max: 100, windowMs: 60 * 1000 }));

// --- Core Routes ---

// Welcome Route: Provide a friendly welcome message at the root.
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Welcome to the InsightAPI!',
    documentation: `${req.protocol}://${req.get('host')}/api-docs`,
  });
});

// Health Check: Operational readiness endpoint.
app.get('/health', (req, res) => {
  // In Phase 3, this will check DB connection status as well.
  res.status(200).json({ 
    status: 'ok', 
    service: 'InsightAPI', 
    uptime: process.uptime(),
    environment: config.env
  });
});

// API Routes (Versioned)
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/posts', postRoutes);
app.use('/api/v1/comments', commentRoutes); 
app.use('/api/v1/likes', likeRoutes); 

// CRITICAL: Documentation Route
// Serve the Swagger UI on a dedicated /api-docs route
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// --- Error Handling ---

// 404 Handler: Catch all unhandled routes and throw an operational error.
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404, 'NOT_FOUND'));
});

// Global Error Handler: MUST be the last middleware added.
app.use(errorHandler);

module.exports = app;
