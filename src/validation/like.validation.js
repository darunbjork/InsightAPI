// like.validation.js
// Joi schemas for the Like/Unlike endpoints.

const Joi = require('joi');

const mongoId = Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required().messages({
  'string.pattern.base': 'Id must be a valid MongoDB ObjectId.',
});

const likeUnlike = {
  body: Joi.object().keys({
    // ID of the resource (Post or Comment)
    resourceId: mongoId,
    // Type of resource (must be 'Post' or 'Comment')
    onModel: Joi.string().valid('Post', 'Comment').required().messages({
        'any.only': 'onModel must be either Post or Comment.',
    }),
  }),
};

module.exports = {
  likeUnlike,
};
