// auth.validation.js
// Joi schemas for authentication endpoints.

const Joi = require('joi');

// Define reusable parts for consistency
const password = Joi.string()
  .required()
  .min(8)
  .max(128)
  .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])')) // Requires 1 lowercase, 1 uppercase, 1 number
  .messages({
    'string.min': 'Password must be at least 8 characters.',
    'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number.',
  });

const email = Joi.string().email().required();
const username = Joi.string().required().min(3).max(30);

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
    password: Joi.string().required(), // No need for complexity check on login, just required
  }),
};

module.exports = {
  register,
  login,
};
