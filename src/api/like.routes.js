// like.routes.js
// Express routes for polymorphic Likes/Unlikes.

const express = require('express');
const likeService = require('../services/like.service');
const authenticate = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const likeValidation = require('../validation/like.validation');
const logger = require('../utils/logger');

const router = express.Router();

// POST /api/v1/likes - Like a resource (Post or Comment)
router.post('/', authenticate, validate(likeValidation.likeUnlike), async (req, res, next) => {
  try {
    const { resourceId, onModel } = req.body;
    
    const like = await likeService.likeResource({
      userId: req.user.id,
      resourceId,
      onModel,
    });
    
    logger.info({ 
      event: 'resource_liked', 
      requestId: req.id, 
      userId: req.user.id, 
      resourceId, 
      onModel 
    });

    // Use 201 Created for a new like record
    res.status(201).json({ status: 'success', data: like });
  } catch (error) {
    next(error); 
  }
});

// DELETE /api/v1/likes - Unlike a resource (Post or Comment)
// We use DELETE with a body to clearly identify the unique resource being deleted.
router.delete('/', authenticate, validate(likeValidation.likeUnlike), async (req, res, next) => {
  try {
    const { resourceId, onModel } = req.body;
    
    await likeService.unlikeResource({
      userId: req.user.id,
      resourceId,
      onModel,
    });
    
    logger.info({ 
      event: 'resource_unliked', 
      requestId: req.id, 
      userId: req.user.id, 
      resourceId, 
      onModel 
    });

    // Use 204 No Content for successful deletion
    res.status(204).json({ status: 'success', data: null }); 
  } catch (error) {
    next(error);
  }
});

module.exports = router;
