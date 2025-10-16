// jest.config.js
module.exports = {
  // Use a custom environment for MongoDB testing
  preset: '@shelf/jest-mongodb',
  
  // Global setup/teardown for the MongoDB memory server
  globalSetup: '<rootDir>/tests/globalSetup.js',
  globalTeardown: '<rootDir>/tests/globalTeardown.js',
  
  // Test file patterns
  testMatch: [
    '**/tests/**/*.test.js',
  ],
  
  // Setup file for connecting/disconnecting to the database
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup.js', // We will create this file shortly
  ],
  
  // Automatically clear mock calls and instances between tests
  clearMocks: true,
  
  // Reporter configuration (optional, for clean output)
  reporters: [
    'default',
  ],
  
  // Use Node.js environment
  testEnvironment: 'node',
};
