// auth.integration.test.js

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/app');
const User = require('../../src/models/User');

// Generate unique test credentials
const testUser = {
  username: 'testuser_jest',
  email: 'jest@test.com',
  password: 'Password123',
};

describe('Auth Endpoints Integration', () => {
  
  // Ensure the database connection is ready and the User model is accessible
  beforeAll(async () => {
    // We assume the MongoDB connection is handled by jest-mongodb preset
    // If not using the preset, you would connect/disconnect Mongoose here
  });

  // CRITICAL: Ensure database cleanup before each test
  beforeEach(async () => {
    await User.deleteMany({});
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a user successfully', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(testUser);

      expect(res.statusCode).toEqual(201);
      expect(res.body.status).toBe('success');
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe(testUser.email);

      // Verify user is in database
      const userInDb = await User.findOne({ email: testUser.email });
      expect(userInDb).not.toBeNull();
      expect(userInDb.password).not.toBe(testUser.password); // Password should be hashed
    });

    it('should return 400 for invalid password complexity', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ ...testUser, password: 'short' }); // Invalid password

      expect(res.statusCode).toEqual(400);
      expect(res.body.code).toBe('INPUT_VALIDATION_FAILED');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    // Setup: Register a user before testing login
    beforeEach(async () => {
      await request(app).post('/api/v1/auth/register').send(testUser);
    });

    it('should log in a user and set cookies', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testUser.email, password: testUser.password });

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toBe('success');
      expect(res.headers['set-cookie']).toBeDefined();
      
      // Check for the accessToken cookie in the response headers
      const accessTokenCookie = res.headers['set-cookie'].find(c => c.startsWith('accessToken'));
      expect(accessTokenCookie).toContain('HttpOnly'); // Check for security flag
    });

    it('should return 401 for incorrect password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testUser.email, password: 'WrongPassword123' });

      expect(res.statusCode).toEqual(401);
      expect(res.body.code).toBe('AUTH_FAILED');
    });
  });
  
  // Test token refreshing and logout here for a complete lifecycle...
});