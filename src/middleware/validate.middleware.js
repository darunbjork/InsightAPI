// validate.middleware.js
// Generic middleware to validate request data against a Joi schema.

const Joi = require('joi');
const AppError = require('../utils/AppError');

// Middleware factory that takes a schema object ({ body, query, params })
const validate = (schema) => (req, res, next) => {
  // 1. Define the object to be validated: combines body, query, and params
  const object = {};
  if (schema.params) object.params = req.params;
  if (schema.query) object.query = req.query;
  if (schema.body) object.body = req.body;

  // 2. Compile the schema using Joi's object structure
  const validationSchema = Joi.object(schema);

  // 3. Perform validation
  const { value, error } = validationSchema.validate(object, {
    abortEarly: false, // Return all errors, not just the first one
    allowUnknown: true, // Allow fields not defined in the schema (e.g., req.user)
    stripUnknown: true, // Remove fields not defined in the schema
  });

  if (error) {
    // 4. Transform Joi error into a consistent AppError (400)
    const errorMessage = error.details.map((detail) => detail.message.replace(/['"]/g, '')).join(', ');
    
    return next(new AppError(`Validation error: ${errorMessage}`, 400, 'INPUT_VALIDATION_FAILED'));
  }

  // 5. Update the request object with the validated and cleaned values
  // This ensures controllers only receive sanitized data (e.g., unknown fields stripped)
  Object.assign(req, value);

  next();
};

module.exports = validate;
