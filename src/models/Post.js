// Post.js
// Mongoose schema for the Post model. Uses denormalization for faster reads.

const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Post title is required.'],
    trim: true,
    maxlength: [100, 'Title cannot be more than 100 characters.'],
  },
  content: {
    type: String,
    required: [true, 'Post content is required.'],
  },
  // Denormalized Author Data (Cached for Feed Read Performance)
  // This saves a lookup to the User collection for every post display.
  author: {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // Reference to the User model
      required: true,
    },
    username: {
      type: String,
      required: true,
    },
    // In later phases, we'd add 'avatar' field here as well
  },
  // Counts (Strategic Denormalization - Cached for display)
  commentCount: {
    type: Number,
    default: 0,
  },
  likeCount: {
    type: Number,
    default: 0,
  }
}, {
  timestamps: true, // createdAt and updatedAt
});

// IMPORTANT: Define an index on the author.id for efficient querying of a user's posts
PostSchema.index({ 'author.id': 1 });

const Post = mongoose.model('Post', PostSchema);

module.exports = Post;
