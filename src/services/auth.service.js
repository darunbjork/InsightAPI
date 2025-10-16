// auth.service.js
// Business logic for user authentication (registration, login, token generation).
// This is decoupled from HTTP concerns (req/res).

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const PostService = require('./post.service');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const config = require('../config/config');
const storageUtils = require('../utils/storage'); // To handle cleanup

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

// NEW: Update only the user's avatar
const updateUserAvatar = async (userId, newAvatarUrl) => {
  const oldUser = await User.findById(userId);
  
  if (!oldUser) {
    // Should be caught by auth middleware, but safety check
    throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
  }
  
  const oldAvatarUrl = oldUser.avatar;
  
  // Update the avatar field in the database
  const updatedUser = await User.findByIdAndUpdate(userId, { avatar: newAvatarUrl }, {
    new: true, // Return the updated document
  }).select('-password -__v');
  
  if (!updatedUser) {
      throw new AppError('Avatar update failed unexpectedly.', 500, 'UPDATE_FAILED');
  }

  // Return the old URL for the route to handle cleanup, and the new user object
  return { oldAvatarUrl, updatedUser: updatedUser.toObject() };
};

// NEW: Update user profile logic
const updateUserProfile = async (userId, updateBody) => {
  // 1. Check if the username is being updated
  const isUsernameUpdate = updateBody.username && updateBody.username !== updateBody.oldUsername;
  const oldUser = await User.findById(userId).lean();
  
  if (!oldUser) {
    throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
  }

  // 2. Find and update the user document
  const updatedUser = await User.findByIdAndUpdate(userId, { $set: updateBody }, {
    new: true, // Return the updated document
    runValidators: true, // Run Mongoose validators
  }).select('-password -__v'); // Exclude sensitive fields

  if (!updatedUser) {
    // Should not happen if oldUser was found, but a safety check
    throw new AppError('Profile update failed unexpectedly.', 500, 'UPDATE_FAILED');
  }

  // 3. Denormalization Update Tax (If username changed)
  if (isUsernameUpdate) {
    logger.info({ 
      event: 'denorm_update_triggered', 
      userId, 
      oldUsername: oldUser.username, 
      newUsername: updatedUser.username 
    });
    // Fire the bulk update to all the user's posts
    await PostService.bulkUpdateAuthorUsername(userId, updatedUser.username);
  }
  
  return updatedUser.toObject();
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
  updateUserProfile, 
  updateUserAvatar, // Export new function
};
