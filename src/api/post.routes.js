// post.routes.js
// Express routes for Posts. Delegates logic to post.service.js.

const express = require('express');
const postService = require('../services/post.service');
const authenticate = require('../middleware/auth.middleware');
const logger = require('../utils/logger');
const AppError = require('../utils/AppError');

const router = express.Router();

// Middleware to check if the authenticated user is the author of the post
// This is our first example of **Composable Authorization Middleware**
const checkPostOwnership = async (req, res, next) => {
  try {
    const postId = req.params.id;
    // We only need the author's ID, so select only that field for efficiency
    const post = await postService.getPostById(postId);

    // Convert ObjectIds to strings for safe comparison
    if (post.author.id.toString() !== req.user.id.toString()) {
      logger.warn({ 
        event: 'authz_failed', 
        requestId: req.id, 
        userId: req.user.id, 
        postId, 
        reason: 'Not owner' 
      });
      // Use 403 Forbidden for authorization failure
      return next(new AppError('Forbidden: You do not own this post.', 403, 'AUTHZ_FORBIDDEN'));
    }

    // Attach the post object to the request for the controller to use (optimization)
    req.post = post;
    next();
  } catch (error) {
    next(error);
  }
};

// --- Routes ---

// GET /api/v1/posts - The feed
router.get('/', async (req, res, next) => {
  try {
    // NOTE: We don't require authentication to READ the public feed
    const posts = await postService.getPosts(req.query);
    
    res.status(200).json({ 
      status: 'success', 
      results: posts.length,
      data: posts 
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/posts - Create a new post (Requires auth)
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { title, content } = req.body;
    
    // We already have user info from the authentication middleware
    const post = await postService.createPost({
      title,
      content,
      authorId: req.user.id,
      authorUsername: req.user.username,
    });
    
    logger.info({ event: 'post_created', requestId: req.id, userId: req.user.id, postId: post._id });

    res.status(201).json({ status: 'success', data: post });
  } catch (error) {
    // Mongoose validation errors will be caught here and sent to the global handler
    next(error); 
  }
});

// GET /api/v1/posts/:id - Get a specific post
router.get('/:id', async (req, res, next) => {
  try {
    const post = await postService.getPostById(req.params.id);
    res.status(200).json({ status: 'success', data: post });
  } catch (error) {
    next(error);
  }
});

// PUT /api/v1/posts/:id - Update a post (Requires auth AND ownership)
router.put('/:id', authenticate, checkPostOwnership, async (req, res, next) => {
  try {
    const { title, content } = req.body;
    const updateBody = { title, content }; // Only allow these fields

    const post = await postService.updatePost(req.params.id, updateBody);

    logger.info({ event: 'post_updated', requestId: req.id, userId: req.user.id, postId: post._id });

    res.status(200).json({ status: 'success', data: post });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/v1/posts/:id - Delete a post (Requires auth AND ownership)
router.delete('/:id', authenticate, checkPostOwnership, async (req, res, next) => {
  try {
    await postService.deletePost(req.params.id);

    logger.info({ event: 'post_deleted', requestId: req.id, userId: req.user.id, postId: req.params.id });

    // Use 204 No Content for successful deletion
    res.status(204).json({ status: 'success', data: null }); 
  } catch (error) {
    next(error);
  }
});

module.exports = router;
