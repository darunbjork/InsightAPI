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

// ... (Server start logic remains the same)