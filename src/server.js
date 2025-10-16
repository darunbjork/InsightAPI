// server.js
// Server startup file. Handles infrastructure setup (DB connection, server listen).
// Separated from app.js to keep app.js focused on Express routing/middleware for testing.

const mongoose = require('mongoose');
const app = require('./app');
const logger = require('./utils/logger');
const config = require('./config/config');

// --- Centralized Error Handling for Uncaught Exceptions / Unhandled Rejections ---
// Critical for production systems: Catch errors that occur outside of Express.

// Uncaught Exceptions (Synchronous Code Errors)
process.on('uncaughtException', (err) => {
  logger.error({ 
    event: 'uncaught_exception', 
    message: err.message, 
    stack: err.stack 
  });
  // Shut down the server gracefully after logging
  process.exit(1);
});

// Unhandled Rejections (Asynchronous Code Errors, e.g., failed promise)
process.on('unhandledRejection', (err) => {
  logger.error({ 
    event: 'unhandled_rejection', 
    message: err.message, 
    stack: err.stack 
  });
  // Shut down the server gracefully after logging
  process.exit(1); 
});

// --- Database Connection ---

const connectDB = async () => {
  try {
    // The `useNewUrlParser` and other options are default in Mongoose 6+
    await mongoose.connect(config.mongo.uri);
    logger.info({ event: 'database_connect_success', uri: config.mongo.uri });
  } catch (error) {
    // CRITICAL: What happens if MongoDB dies? The app MUST NOT start.
    logger.error({ 
      event: 'database_connect_failure', 
      message: 'MongoDB connection failed!', 
      error: error.message 
    });
    // Exit with failure code, so Docker/process manager knows to restart/alert.
    process.exit(1); 
  }
};

// Start the server
connectDB().then(() => {
  const server = app.listen(config.port, () => {
    logger.info({ 
      event: 'server_start', 
      port: config.port, 
      env: config.env 
    });
  });

  // Handle server closing events for a graceful shutdown
  const shutdown = () => {
    server.close(() => {
      logger.info({ event: 'server_shutdown', message: 'Express server closed.' });
      mongoose.connection.close(false, () => { // false means do not force-close
        logger.info({ event: 'database_disconnect', message: 'MongoDB connection closed.' });
        process.exit(0);
      });
    });
  };

  process.on('SIGTERM', shutdown); // Kubernetes/Docker graceful shutdown
  process.on('SIGINT', shutdown);  // Ctrl+C
});
