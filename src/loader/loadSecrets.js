/**
 * Loader — the ONLY file a real application ever imports from secrets-manager.
 *
 * Usage in your app's entry file (e.g., index.js, app.js, server.js):
 *   require('./secrets-manager/src/loader/loadSecrets')()
 *     .then(() => { /* start your app *\/ })
 *     .catch(err => { console.error(err); process.exit(1); });
 *
 * Or with async/await at the top of your entry file (in an IIFE):
 *   (async () => {
 *     await require('./secrets-manager/src/loader/loadSecrets')({ override: true });
 *     // ... start your app
 *   })();
 *
 * This connects to MongoDB, fetches all secrets, decrypts each, and sets
 * process.env[key] = value for each one (skipping already-set vars unless
 * override is true).
 */
const mongoose = require('mongoose');
const Secret = require('../models/Secret.model');
const { decrypt } = require('../utils/encrypt.util');
const logger = require('../config/logger');
const { MONGO_URI } = require('../config/db');

/**
 * Load all secrets from MongoDB into process.env.
 * @param {Object} options
 * @param {boolean} options.override - If true, override already-set env vars (default: false).
 * @returns {Promise<number>} Number of secrets loaded into process.env.
 */
async function loadSecrets({ override = false } = {}) {
  let loadedCount = 0;

  try {
    // Connect to MongoDB (if not already connected)
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGO_URI);
      logger.info('loader connected to MongoDB');
    }

    const secrets = await Secret.find({}).lean();

    if (secrets.length === 0) {
      logger.warn('loader found no secrets in database');
      return 0;
    }

    for (const secret of secrets) {
      const envKey = secret.key;

      // Skip if already set and override is false
      if (process.env[envKey] !== undefined && !override) {
        logger.info(`loader skipped ${envKey} (already set)`);
        continue;
      }

      try {
        const plainValue = decrypt({
          value: secret.value,
          iv: secret.iv,
          authTag: secret.authTag,
        });

        process.env[envKey] = plainValue;
        loadedCount++;
      } catch (decryptErr) {
        logger.error(`loader failed to decrypt ${envKey}`, decryptErr.message);
      }
    }

    // Disconnect — the app will manage its own connections
    await mongoose.disconnect();

    logger.info('secrets loaded into process.env', `${loadedCount} secrets loaded`);
    return loadedCount;
  } catch (err) {
    logger.error('loader failed', err.message);
    throw err;
  }
}

module.exports = loadSecrets;