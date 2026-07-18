/**
 * MongoDB connection configuration.
 * Connects to a LOCAL MongoDB instance — no auth, no network exposure.
 * The URI is hardcoded because it's only ever localhost, which is not sensitive.
 */
const mongoose = require('mongoose');

const MONGO_URI = `mongodb://localhost:27017/${process.env.PROJECT_NAME || 'secrets-manager'}`;

async function connectDB() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log(`[DB] Connected to MongoDB at ${MONGO_URI}`);
  } catch (err) {
    console.error(`[DB] Failed to connect to MongoDB at ${MONGO_URI}`);
    console.error(`[DB] Ensure MongoDB is installed and running locally.`);
    console.error(`[DB] Error: ${err.message}`);
    process.exit(1);
  }
}

async function disconnectDB() {
  try {
    await mongoose.disconnect();
    console.log('[DB] Disconnected from MongoDB');
  } catch (err) {
    console.error(`[DB] Error disconnecting: ${err.message}`);
  }
}

module.exports = { connectDB, disconnectDB, MONGO_URI };