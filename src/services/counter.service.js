// counter.service.js
// Generic service for performing atomic counter updates on any Mongoose model.

const mongoose = require('mongoose');
const AppError = require('../utils/AppError');

/**
 * Atomically increments or decrements a specific counter field on a Mongoose document.
 * @param {string} modelName - The name of the Mongoose model (e.g., 'Post', 'Comment').
 * @param {string} resourceId - The ID of the document to update.
 * @param {string} counterField - The name of the field to update (e.g., 'likeCount', 'commentCount').
 * @param {number} incrementValue - The value to increment/decrement by (usually 1 or -1).
 * @returns {number} The new value of the counter field.
 */
const updateCounter = async (modelName, resourceId, counterField, incrementValue) => {
  // Get the actual Mongoose Model object dynamically
  const Model = mongoose.model(modelName);
  
  if (!Model) {
    throw new AppError(`Model ${modelName} not found in Mongoose registry.`, 500, 'INVALID_MODEL_REF');
  }

  // Define the update object: {$inc: { [counterField]: incrementValue }}
  const updateOperation = { 
    $inc: { [counterField]: incrementValue } 
  };
  
  // Define the projection (select only the new counter value)
  const projection = {};
  projection[counterField] = 1;

  // Execute the atomic update
  const updatedDoc = await Model.findByIdAndUpdate(
    resourceId, 
    updateOperation,
    { new: true, select: projection } 
  ).lean();

  if (!updatedDoc) {
    // Determine the appropriate 404 error based on the model
    const code = `${modelName.toUpperCase()}_NOT_FOUND`;
    throw new AppError(`${modelName} with ID ${resourceId} not found.`, 404, code);
  }

  return updatedDoc[counterField];
};

module.exports = {
  updateCounter,
};
