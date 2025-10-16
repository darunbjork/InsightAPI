// comment.routes.js
// Express routes for Comments.

const express = require('express');
const commentService = require('../services/comment.service');
const authenticate = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const commentValidation = require('../validation/comment.validation');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

const router = express.Router();

// Middleware to check if the authenticated user is the author of the comment
const checkCommentOwnership = async (req, res, next) => {
  try {
    const commentId = req.params.commentId;
    
    // We only need the author's ID
    const comment = await commentService.getCommentById(commentId); // NOTE: We'll add this simple fetch to the service

    if (!comment) {
      return next(new AppError(`Comment with ID ${commentId} not found.`, 404, 'COMMENT_NOT_FOUND'));
    }
    
    // Ensure the retrieved comment's author ID matches the authenticated user ID
    if (comment.author.id.toString() !== req.user.id.toString()) {
      logger.warn({ 
        event: 'authz_failed', 
        requestId: req.id, 
        userId: req.user.id, 
        commentId, 
        reason: 'Not owner' 
      });
      return next(new AppError('Forbidden: You do not own this comment.', 403, 'AUTHZ_FORBIDDEN'));
    }

    req.comment = comment; // Attach for potential use
    next();
  } catch (error) {
    next(error);
  }
};


// --- Routes ---
// NOTE: We structure the API path to imply nesting: /api/v1/posts/:postId/comments

// 1. GET /api/v1/comments/:postId - Get all comments for a post
router.get('/post/:postId', validate(commentValidation.getComments), async (req, res, next) => {
  try {
    const { postId } = req.params;
    // We pass req.query for future pagination support
    const comments = await commentService.getCommentsForPost(postId, req.query); 
    
    res.status(200).json({ 
      status: 'success', 
      results: comments.length,
      data: comments 
    });
  } catch (error) {
    next(error);
  }
});

// 2. POST /api/v1/comments/post/:postId - Create a new comment (Requires auth)
router.post('/post/:postId', authenticate, validate(commentValidation.createComment), async (req, res, next) => {
  try {
    const { postId } = req.params;
    const { content } = req.body;
    
    const comment = await commentService.createComment({
      postId,
      content,
      authorId: req.user.id,
      authorUsername: req.user.username,
    });
    
    logger.info({ event: 'comment_created', requestId: req.id, userId: req.user.id, postId, commentId: comment._id });

    res.status(201).json({ status: 'success', data: comment });
  } catch (error) {
    next(error); 
  }
});

// 3. PUT /api/v1/comments/:commentId - Update a comment (Requires auth AND ownership)
router.put('/:commentId', authenticate, validate(commentValidation.updateComment), checkCommentOwnership, async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    
    const comment = await commentService.updateComment(commentId, { content });

    logger.info({ event: 'comment_updated', requestId: req.id, userId: req.user.id, commentId });

    res.status(200).json({ status: 'success', data: comment });
  } catch (error) {
    next(error);
  }
});

// 4. DELETE /api/v1/comments/:commentId - Delete a comment (Requires auth AND ownership)
router.delete('/:commentId', authenticate, validate(commentValidation.deleteComment), checkCommentOwnership, async (req, res, next) => {
  try {
    await commentService.deleteComment(req.params.commentId);

    logger.info({ event: 'comment_deleted', requestId: req.id, userId: req.user.id, commentId: req.params.commentId });

    res.status(204).json({ status: 'success', data: null }); 
  } catch (error) {
    next(error);
  }
});

module.exports = router;
