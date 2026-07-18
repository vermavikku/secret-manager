/**
 * Mongoose schema for storing encrypted secrets.
 * Each secret's value is stored as ciphertext with its IV and auth tag.
 */
const mongoose = require('mongoose');

const secretSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: [true, 'Secret key is required'],
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    value: {
      type: String,
      required: [true, 'Encrypted value is required'],
    },
    iv: {
      type: String,
      required: [true, 'Initialization vector is required'],
    },
    authTag: {
      type: String,
      required: [true, 'Authentication tag is required'],
    },
    description: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Secret', secretSchema);