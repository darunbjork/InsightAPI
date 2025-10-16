// comment.service.js
// Business logic for Comment management.

const Comment = require('../models/Comment');
const PostService = require('./post.service');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const mongoose = require('mongoose');

// 1. Create a new comment
const createComment = async ({ postId, content, authorId, authorUsername }) => {
  // 1.1. Create the comment
  const comment = await Comment.create({
    postId,
    content,
    author: {
      id: authorId,
      username: authorUsername,
    },
  });

  // 1.2. CRITICAL: Atomically increment the commentCount on the Post
  try {
    await PostService.updateCommentCount(postId, 1);
  } catch (error) {
    // LOG & CLEANUP: If post update fails (e.g., post was deleted in parallel), 
    // we should consider deleting the comment we just created to maintain consistency.
    // For Phase 1, we just log the error and let the AppError propagate.
    logger.error({ 
      event: 'comment_count_update_fail', 
      postId, 
      commentId: comment._id, 
      error: error.message 
    });
    // NOTE: In production, this would use a Mongoose transaction or queue a reconciliation job.
  }
  
  return comment.toObject();
};

// 2. Get comments for a specific post (Paginated)
const getCommentsForPost = async (postId, query) => {
  // Use a simple, non-paginated fetch for Phase 1, sorted by oldest first (like a feed)
  const comments = await Comment.find({ postId })
    .sort({ createdAt: 1 }) // Show oldest first (typical for comment threads)
    .lean()
    .exec();

  return comments;
};

// 3. Update a comment
const updateComment = async (commentId, updateBody) => {
  const allowedUpdates = ['content'];
  const updates = Object.keys(updateBody).filter(key => allowedUpdates.includes(key));
  
  if (updates.length === 0) {
    throw new AppError('No valid fields provided for update.', 400, 'INVALID_UPDATE');
  }
  
  const comment = await Comment.findByIdAndUpdate(
    commentId, 
    { $set: updateBody },
    { new: true, runValidators: true }
  ).lean();

  if (!comment) {
    throw new AppError(`Comment with ID ${commentId} not found.`, 404, 'COMMENT_NOT_FOUND');
  }

  return comment;
};

// 4. Delete a comment
const deleteComment = async (commentId) => {
  const comment = await Comment.findByIdAndDelete(commentId);
  
  if (!comment) {
    throw new AppError(`Comment with ID ${commentId} not found.`, 404, 'COMMENT_NOT_FOUND');
  }

  // 4.2. CRITICAL: Atomically decrement the commentCount on the Post
  try {
    await PostService.updateCommentCount(comment.postId, -1);
  } catch (error) {
    logger.error({ 
      event: 'comment_count_decrement_fail', 
      postId: comment.postId, 
      commentId, 
      error: error.message 
    });
    // Log, but do not re-throw, as the comment is already deleted (main operation succeeded).
  }
  
  return comment.toObject();
};

// NEW: Simple fetch for authorization check
const getCommentById = async (commentId) => {
  // Use .lean() and select only the fields needed for authorization (author ID)
  const comment = await Comment.findById(commentId).select('author.id postId').lean();
  return comment;
};

module.exports = {
  createComment,
  getCommentsForPost,
  updateComment,
  deleteComment,
  getCommentById, // EXPORTED
};
