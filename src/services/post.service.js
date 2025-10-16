// post.service.js (UPDATED)
// Business logic for Post management (Create, Read, Update, Delete), now with bulk updates and pagination.

const Post = require('../models/Post');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

// 1. Create a new post
const createPost = async ({ title, content, authorId, authorUsername }) => {
  // Validation is assumed to be handled by Mongoose schema checks or dedicated middleware (Phase 2)
  const post = await Post.create({
    title,
    content,
    author: {
      id: authorId,
      username: authorUsername,
    },
  });
  
  // Clean Mongoose object before returning
  return post.toObject();
};

// 2. Get a single post by ID
const getPostById = async (postId) => {
  const post = await Post.findById(postId);
  
  if (!post) {
    throw new AppError(`Post with ID ${postId} not found.`, 404, 'POST_NOT_FOUND');
  }
  
  return post.toObject();
};

// 3. Get all posts (The Feed) - Initial, unpaginated version
const getPosts = async (query = {}) => {
  const page = parseInt(query.page, 10) || 1;
  const limit = parseInt(query.limit, 10) || 20;
  const skip = (page - 1) * limit;

  // Build the MongoDB filter object
  const filter = {};
  if (query.authorId) {
    filter['author.id'] = query.authorId;
  }
  
  // Get posts for the current page
  const posts = await Post.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean()
    .exec();
    
  // Get the total count of documents matching the filter
  const totalResults = await Post.countDocuments(filter);
  const totalPages = Math.ceil(totalResults / limit);

  return {
    posts,
    page,
    limit,
    totalResults,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
};

// 4. Update a post
const updatePost = async (postId, updateBody) => {
  // Check that only updatable fields are present (e.g., block changing commentCount)
  const allowedUpdates = ['title', 'content'];
  const updates = Object.keys(updateBody).filter(key => allowedUpdates.includes(key));

  if (updates.length === 0) {
    throw new AppError('No valid fields provided for update.', 400, 'INVALID_UPDATE');
  }

  // FindByIdAndUpdate runs validators by default and returns the NEW document
  const post = await Post.findByIdAndUpdate(
    postId, 
    { $set: updateBody }, // Use $set to only update provided fields
    { new: true, runValidators: true }
  );

  if (!post) {
    throw new AppError(`Post with ID ${postId} not found.`, 404, 'POST_NOT_FOUND');
  }

  return post.toObject();
};

// 5. Delete a post
const deletePost = async (postId) => {
  const post = await Post.findByIdAndDelete(postId);
  
  if (!post) {
    throw new AppError(`Post with ID ${postId} not found.`, 404, 'POST_NOT_FOUND');
  }
  
  // Return the deleted post for audit logging/confirmation
  return post.toObject();
};

// NEW: 2. Bulk update denormalized author data
// This is called by auth.service.js after a user changes their username.
const bulkUpdateAuthorUsername = async (authorId, newUsername) => {
  // Use Mongoose's updateMany for efficiency
  const result = await Post.updateMany(
    { 'author.id': authorId }, // Filter for all posts by this author
    { $set: { 'author.username': newUsername } } // Update the denormalized field
  );
  
  // Log the operation for audit/debugging
  logger.info({
    event: 'denorm_update_completed',
    authorId: authorId,
    newUsername: newUsername,
    matchedCount: result.matchedCount,
    modifiedCount: result.modifiedCount,
  });
  
  return result;
};


module.exports = {
  createPost,
  getPostById,
  getPosts, // Export updated function
  updatePost,
  deletePost,
  bulkUpdateAuthorUsername, // Export new function
};
