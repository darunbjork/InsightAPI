// User.js
// Mongoose schema for the User model. Handles pre-save password hashing.

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const config = require('../config/config');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    // Add basic validation at the schema level
    minlength: [3, 'Username must be at least 3 characters'],
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    // NEVER send the hash back
    select: false, 
  },
      // Field for refresh token revocation
    // This will store a list of blacklisted/revoked refresh tokens by their JTI (JWT ID)
    blacklistedRefreshTokens: {
      type: [String],
      default: [],
    },
    avatar: {
      type: String,
      default: '/public/defaults/avatar.png',
    }
  }, {
    timestamps: true, // Add createdAt and updatedAt fields
  });
// Middleware to hash password before saving (pre-save hook)
UserSchema.pre('save', async function (next) {
  // Only run this function if password was actually modified
  if (!this.isModified('password')) return next();

  // Hash the password with cost factor from config
  const salt = await bcrypt.genSalt(config.bcryptSaltRounds);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Instance method to compare passwords
UserSchema.methods.comparePassword = async function (candidatePassword) {
  // bcrypt.compare is safer than manually hashing and comparing
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', UserSchema);

module.exports = User;
