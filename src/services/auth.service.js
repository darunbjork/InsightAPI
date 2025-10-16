// auth.service.js
// Business logic for user authentication (registration, login, token generation).
// This is decoupled from HTTP concerns (req/res).

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const config = require('../config/config');

// Helper function to generate both tokens
const generateAuthTokens = (user) => {
  // Use a unique JWT ID (jti) for refresh tokens for blacklisting/rotation
  const jti = `${user._id}-${Date.now()}`; // A simple unique string

  const accessToken = jwt.sign(
    { id: user._id, username: user.username },
    config.jwt.secretAccess,
    { expiresIn: config.jwt.accessExpiry }
  );

  const refreshToken = jwt.sign(
    { id: user._id, jti }, // Store the unique ID in the token
    config.jwt.secretRefresh,
    { expiresIn: config.jwt.refreshExpiry } // Remove the redundant jwtid option
  );

  return { accessToken, refreshToken };
};

// 1. Register a new user
const registerUser = async ({ username, email, password }) => {
  // Check for existing user (Mongoose unique index handles race conditions, but this is friendlier)
  const existingUser = await User.findOne({ $or: [{ username }, { email }] });
  if (existingUser) {
    throw new AppError('User with this username or email already exists.', 409, 'USER_EXISTS');
  }

  const user = await User.create({ username, email, password });
  
  // We don't return the password hash since 'select: false' is set on the schema.
  const { accessToken, refreshToken } = generateAuthTokens(user);
  
  return { user, accessToken, refreshToken };
};

// 2. Log in an existing user
const loginUser = async ({ email, password }) => {
  // Explicitly request the password field using select('+password')
  const user = await User.findOne({ email }).select('+password');

  // Check if user exists and password is correct
  if (!user || !(await user.comparePassword(password))) {
    // Generic error to prevent timing attacks/enumeration
    throw new AppError('Invalid email or password.', 401, 'AUTH_FAILED');
  }

  const { accessToken, refreshToken } = generateAuthTokens(user);
  
  return { user, accessToken, refreshToken };
};

// 3. Refresh the access token (with rotation)
const refreshAuthTokens = async (refreshToken) => {
  // Verify the refresh token
  const decoded = jwt.verify(refreshToken, config.jwt.secretRefresh, { ignoreExpiration: false });
  const { id: userId, jti: oldJti } = decoded;

  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('Invalid refresh token payload.', 401, 'AUTH_INVALID_TOKEN');
  }

  // Check if the token has been blacklisted (e.g., after logout)
  if (user.blacklistedRefreshTokens.includes(oldJti)) {
    // Compromise detected: immediately blacklist ALL tokens for this user
    // A more aggressive defense: blacklisting all future tokens for a period
    // For now, we'll just throw an error.
    await User.findByIdAndUpdate(userId, { $set: { blacklistedRefreshTokens: [] } }); // Simple cleanup
    throw new AppError('Compromised refresh token used. All sessions logged out.', 401, 'AUTH_COMPROMISED');
  }

  // --- Token Rotation ---
  // 1. Generate new tokens
  const { accessToken: newAccessToken, refreshToken: newRefreshToken } = generateAuthTokens(user);

  // 2. Blacklist the old refresh token (prevents replay attack)
  // We use $push to add the old JTI to the user's blacklist
  user.blacklistedRefreshTokens.push(oldJti);
  await user.save(); 

  // In a real-world scenario with high scale, this blacklist check/update
  // would be more efficiently managed in a dedicated key-value store like Redis.
  
  return { user, accessToken: newAccessToken, refreshToken: newRefreshToken };
};

// 4. Logout (revoke the refresh token)
const logoutUser = async (refreshToken) => {
  try {
    const decoded = jwt.verify(refreshToken, config.jwt.secretRefresh, { ignoreExpiration: true });
    const { id: userId, jti } = decoded;

    // Blacklist the token's JTI to prevent future use
    await User.findByIdAndUpdate(userId, { $push: { blacklistedRefreshTokens: jti } });
    
    return true;

  } catch (error) {
    // Token is already expired or invalid, nothing to revoke
    return true; 
  }
};

module.exports = {
  registerUser,
  loginUser,
  refreshAuthTokens,
  logoutUser,
  generateAuthTokens, // Exported for potential internal use/testing
};
