// like.service.js
// Business logic for polymorphic Likes.

const Like = require('../models/Like');
const PostService = require('./post.service');
const CommentService = require('./comment.service');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

// Helper to determine the correct service for the atomic count update
const getTargetService = (onModel) => {
  if (onModel === 'Post') return PostService;
  if (onModel === 'Comment') return CommentService;
  throw new AppError(`Invalid resource type for liking: ${onModel}`, 400, 'INVALID_MODEL');
};

// 1. Like a resource (Post or Comment)
const likeResource = async ({ userId, resourceId, onModel }) => {
  // 1.1. Check if the like already exists (unique index constraint handles this, but a query is cleaner for checking)
  const existingLike = await Like.findOne({ userId, resourceId, onModel });

  if (existingLike) {
    throw new AppError('Resource already liked by this user.', 409, 'ALREADY_LIKED');
  }
  
  // 1.2. Create the Like record
  const like = await Like.create({ userId, resourceId, onModel });

  // 1.3. CRITICAL: Atomically increment the likeCount on the target resource
  try {
    const targetService = getTargetService(onModel);
    await targetService.updateLikeCount(resourceId, 1);
  } catch (error) {
    // If the target resource (Post/Comment) is not found or fails, 
    // we should delete the created Like to maintain data integrity.
    await Like.findByIdAndDelete(like._id);
    logger.error({ 
      event: 'like_count_update_fail_cleanup', 
      resourceId, onModel, 
      error: error.message 
    });
    // Re-throw the original error (e.g., POST_NOT_FOUND)
    throw error;
  }
  
  return like.toObject();
};

// 2. Unlike a resource (Post or Comment)
const unlikeResource = async ({ userId, resourceId, onModel }) => {
  // 2.1. Find and delete the like record
  const result = await Like.findOneAndDelete({ userId, resourceId, onModel });

  if (!result) {
    // If the like doesn't exist, we don't treat it as an error, just return confirmation.
    logger.warn({ event: 'unlike_not_found', userId, resourceId, onModel });
    return { message: 'Like record not found or already deleted.' };
  }
  
  // 2.2. CRITICAL: Atomically decrement the likeCount on the target resource
  try {
    const targetService = getTargetService(onModel);
    await targetService.updateLikeCount(resourceId, -1);
  } catch (error) {
    logger.error({ 
      event: 'unlike_count_decrement_fail', 
      resourceId, onModel, 
      error: error.message 
    });
    // Log, but do not re-throw, as the unlike operation succeeded.
  }
  
  return result.toObject();
};


module.exports = {
  likeResource,
  unlikeResource,
};
