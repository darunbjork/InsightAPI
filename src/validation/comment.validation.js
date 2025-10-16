// comment.validation.js
// Joi schemas for Comment CRUD endpoints.

const Joi = require('joi');

const mongoId = Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required().messages({
  'string.pattern.base': 'Id must be a valid MongoDB ObjectId.',
});

const createComment = {
  params: Joi.object().keys({
    postId: mongoId, // Ensure the target post ID is valid
  }),
  body: Joi.object().keys({
    content: Joi.string().required().min(1).max(500),
  }),
};

// Used for updating and deleting a specific comment
const commentIdParam = {
  params: Joi.object().keys({
    commentId: mongoId,
  }),
};

// Used for getting a list of comments for a post
const getComments = {
  params: Joi.object().keys({
    postId: mongoId,
  }),
  // For Phase 1, we omit query validation for pagination, but it would go here.
};

const updateComment = {
  params: commentIdParam.params,
  body: Joi.object().keys({
    content: Joi.string().required().min(1).max(500),
  }),
};


module.exports = {
  createComment,
  getComments,
  updateComment,
  deleteComment: commentIdParam,
};
