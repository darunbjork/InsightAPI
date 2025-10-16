// post.validation.js (UPDATED)
// Joi schemas for Post CRUD endpoints.

const Joi = require('joi');

// Joi for MongoDB ObjectId pattern check
const mongoId = Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required().messages({
  'string.pattern.base': 'Id must be a valid MongoDB ObjectId.',
});

const createPost = {
  body: Joi.object().keys({
    title: Joi.string().required().min(1).max(100),
    content: Joi.string().required().min(1),
  }),
};

const getPost = {
  params: Joi.object().keys({
    id: mongoId,
  }),
};

const updatePost = {
  params: Joi.object().keys({
    id: mongoId,
  }),
  body: Joi.object().keys({
    title: Joi.string().min(1).max(100),
    content: Joi.string().min(1),
  }).min(1), // Ensure at least one field is provided for update
};

// NEW: Schema for getting a list of posts with pagination
const getPosts = {
  query: Joi.object().keys({
    // Offset (page number, 1-based)
    page: Joi.number().integer().min(1).default(1), 
    // Limit (items per page)
    limit: Joi.number().integer().min(1).max(100).default(20), 
    // Optional: Search by a specific author ID
    authorId: mongoId.optional(),
  }),
};


module.exports = {
  createPost,
  getPost,
  updatePost,
  getPosts, // Export the new schema
};