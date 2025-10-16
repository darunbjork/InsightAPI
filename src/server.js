// server.js (UPDATED)

const mongoose = require('mongoose');
const app = require('./app');
const logger = require('./utils/logger');
const config = require('./config/config');

// ... (Uncaught Exception/Unhandled Rejection handlers remain the same)

// --- Database Connection ---

const connectDB = async () => {
  try {
    await mongoose.connect(config.mongo.uri);
    logger.info({ event: 'database_connect_success', uri: config.mongo.uri });
  } catch (error) {
    logger.error({ 
      event: 'database_connect_failure', 
      message: 'MongoDB connection failed at startup!', 
      error: error.message 
    });
    process.exit(1); 
  }
};

// CRITICAL: Mongoose Connection Error Listeners (Post-Startup)
// If the connection drops *after* the server has started, log it.
mongoose.connection.on('error', (err) => {
  logger.error({ 
    event: 'database_runtime_error', 
    message: 'MongoDB runtime error detected.', 
    error: err.message 
  });
  // NOTE: We don't exit here, as the server might be able to survive temporary outages
  // and Mongoose will attempt to auto-reconnect.
});

// --- Server Start ---

let server;

connectDB().then(() => {
  server = app.listen(config.port, () => {
    logger.info({ event: 'server_started', port: config.port, env: config.env });
  });
});

// --- Graceful Shutdown ---

const exitHandler = () => {
  if (server) {
    server.close(() => {
      logger.info({ event: 'server_closed', message: 'Server closed.' });
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
};

const unexpectedErrorHandler = (error) => {
  logger.error({ event: 'unexpected_error', error: error.message, stack: error.stack });
  exitHandler();
};

process.on('uncaughtException', unexpectedErrorHandler);
process.on('unhandledRejection', unexpectedErrorHandler);

process.on('SIGTERM', () => {
  logger.info({ event: 'sigterm_received', message: 'SIGTERM received.' });
  if (server) {
    server.close();
  }
});
