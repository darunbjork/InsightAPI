// config.js
// Centralized configuration management. Loads environment variables and provides
// defaults and necessary checks.

require('dotenv').config();

const config = {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 5000,
  mongo: {
    uri: process.env.MONGO_URI || 'mongodb://localhost:27017/insightapi',
  },
  jwt: {
    secretAccess: process.env.JWT_SECRET_ACCESS,
    secretRefresh: process.env.JWT_SECRET_REFRESH,
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },
  // Bcrypt cost factor for password hashing
  // 10 is standard/safe. 12 is a good balance for senior-level apps.
  // Higher is safer but slower.
  bcryptSaltRounds: 12, 
};

// CRITICAL CHECK: Ensure secrets are set in a production environment
if (config.env === 'production' && (!config.jwt.secretAccess || !config.jwt.secretRefresh)) {
  throw new Error('FATAL ERROR: JWT secrets are not defined in production environment.');
}

module.exports = config;
