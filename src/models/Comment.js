// Comment.js
// Mongoose schema for the Comment model.

const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
  content: {
    type: String,
    required: [true, 'Comment content is required.'],
    trim: true,
    maxlength: [500, 'Comment cannot be more than 500 characters.'],
  },
  // Reference to the Post this comment belongs to
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: true,
  },
  // Denormalized Author Data (Cached for Feed Read Performance)
  author: {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    username: {
      type: String,
      required: true,
    },
  },
  // We can add a denormalized field for likes/reactions later
  likeCount: {
    type: Number,
    default: 0,
  }
}, {
  timestamps: true, // createdAt and updatedAt
});

// IMPORTANT: Index for fast lookups of comments on a specific post, sorted by creation date
CommentSchema.index({ postId: 1, createdAt: -1 });

const Comment = mongoose.model('Comment', CommentSchema);

module.exports = Comment;
