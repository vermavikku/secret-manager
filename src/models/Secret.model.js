/**
 * Mongoose schema for storing encrypted secrets.
 * Each secret's value is stored as ciphertext with its IV and auth tag.
 *
 * Supports two environments (development / production) per key, so the
 * same key name (e.g. STRIPE_KEY) can hold a different value for each
 * without overwriting one another.
 */
const mongoose = require("mongoose");

const secretSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: [true, "Secret key is required"],
      uppercase: true,
      trim: true,
    },
    environment: {
      type: String,
      required: [true, "Environment is required"],
      enum: {
        values: ["development", "production"],
        message: 'Environment must be either "development" or "production"',
      },
      default: "development",
      lowercase: true,
      trim: true,
    },
    value: {
      type: String,
      required: [true, "Encrypted value is required"],
    },
    iv: {
      type: String,
      required: [true, "Initialization vector is required"],
    },
    authTag: {
      type: String,
      required: [true, "Authentication tag is required"],
    },
    description: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  },
);

// A key can exist once PER environment, not once overall —
// so STRIPE_KEY/development and STRIPE_KEY/production can coexist.
secretSchema.index({ key: 1, environment: 1 }, { unique: true });

module.exports =
  mongoose.models.Secret || mongoose.model("Secret", secretSchema);
