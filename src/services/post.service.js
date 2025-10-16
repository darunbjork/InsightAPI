// post.service.js
// Business logic for Post management (Create, Read, Update, Delete).

const Post = require('../models/Post');
const AppError = require('../utils/AppError');

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
  // For Phase 1, a simple fetch, sorted by newest first
  const posts = await Post.find(query)
    .sort({ createdAt: -1 })
    .lean() // Use .lean() for faster read performance since we don't need Mongoose model methods
    .exec();

  return posts;
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

module.exports = {
  createPost,
  getPostById,
  getPosts,
  updatePost,
  deletePost,
};
