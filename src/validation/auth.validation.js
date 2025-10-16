// auth.validation.js (UPDATED)
// Joi schemas for authentication and user profile endpoints.

const Joi = require('joi');

// Define reusable parts for consistency
const password = Joi.string()
  .required()
  .min(8)
  .max(128)
  .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])'))
  .messages({
    'string.min': 'Password must be at least 8 characters.',
    'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number.',
  });

const email = Joi.string().email().required();
const username = Joi.string().required().min(3).max(30);
const optionalUsername = Joi.string().min(3).max(30);

const register = {
  body: Joi.object().keys({
    username: username,
    email: email,
    password: password,
  }),
};

const login = {
  body: Joi.object().keys({
    email: email,
    password: Joi.string().required(),
  }),
};

// NEW: Schema for updating a user's own profile
const updateProfile = {
  body: Joi.object().keys({
    // Allow updating username or email, but neither is required if one exists
    username: optionalUsername, 
    email: Joi.string().email(),
  }).min(1), // Must provide at least one field to update
};

module.exports = {
  register,
  login,
  updateProfile,
};