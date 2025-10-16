// Like.js
// Mongoose schema for the Like model (Polymorphic).

const mongoose = require('mongoose');

const LikeSchema = new mongoose.Schema({
  // Reference to the user who created the like
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  
  // 1. Polymorphic Field: ID of the resource being liked (Post or Comment)
  resourceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    // Note: We do NOT use 'ref' here because it can refer to multiple models.
  },
  
  // 2. Polymorphic Field: The model name (Post or Comment)
  onModel: {
    type: String,
    required: true,
    enum: ['Post', 'Comment'], // Restrict to only valid models
  },
  
}, {
  timestamps: true, // createdAt
});

// CRITICAL INDEX: Ensures a user can only like a specific resource (Post or Comment) ONCE
// This also makes it fast to check if a user has already liked an item.
LikeSchema.index({ userId: 1, resourceId: 1, onModel: 1 }, { unique: true });

const Like = mongoose.model('Like', LikeSchema);

module.exports = Like;
