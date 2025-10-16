// tests/integration/auth.integration.test.js
// Critical path integration tests for the full authentication flow (API + DB).

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/app');
const User = require('../../src/models/User');
const config = require('../../src/config/config');

// Use a separate test database for isolation
const testMongoUri = 'mongodb://localhost:27017/insightapi-test';

let agent; // Supertest agent to maintain session cookies

beforeAll(async () => {
  console.log('Connecting to test database...');
  // Connect to the test database
  await mongoose.connect(testMongoUri);
  console.log('Connected to test database.');
});

beforeEach(async () => {
  // Clean the database before each test
  await User.deleteMany({});
  // Create a new agent for each test to ensure no lingering cookies
  agent = request.agent(app); 
});

afterAll(async () => {
  // Drop the database and close the connection
  await mongoose.connection.db.dropDatabase();
  await mongoose.connection.close();
});

describe('Authentication Flow Integration', () => {
  const userData = {
    username: 'integration_tester',
    email: 'test@integration.com',
    password: 'Password123!',
  };

  it('should successfully register a user and set HttpOnly cookies', async () => {
    const res = await agent.post('/api/v1/auth/register').send(userData);

    expect(res.statusCode).toBe(201);
    expect(res.body.status).toBe('success');
    expect(res.body.user).toHaveProperty('id');
    
    // CRITICAL: Check for HttpOnly cookies
    const setCookieHeader = res.headers['set-cookie'];
    expect(setCookieHeader).toBeDefined();
    expect(setCookieHeader.find(c => c.startsWith('accessToken='))).toContain('HttpOnly');
    expect(setCookieHeader.find(c => c.startsWith('refreshToken='))).toContain('HttpOnly');
    
    // Verify user exists in the DB
    const userInDb = await User.findOne({ email: userData.email });
    expect(userInDb).not.toBeNull();
  });
  
  it('should successfully log in a registered user and set new cookies', async () => {
    // 1. Register first (to ensure user exists)
    await User.create(userData);
    
    // 2. Log in
    const res = await agent.post('/api/v1/auth/login').send({
      email: userData.email,
      password: userData.password,
    });
    
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('should fail login with incorrect password', async () => {
    await User.create(userData);
    
    const res = await agent.post('/api/v1/auth/login').send({
      email: userData.email,
      password: 'wrongpassword',
    });

    expect(res.statusCode).toBe(401);
    expect(res.body.code).toBe('AUTH_FAILED');
  });
});
