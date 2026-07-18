/**
 * Secrets service — all MongoDB access for secrets lives here.
 * Every write operation triggers a regeneration of .env.example.
 * Supports development and production environments per key.
 */
const Secret = require('../models/Secret.model');
const { encrypt, decrypt } = require('../utils/encrypt.util');
const logger = require('../config/logger');
const { generateEnvExample } = require('../generators/generateEnvExample');

/**
 * List all secrets (metadata only — no decrypted values), filtered by environment.
 * @param {Object} options
 * @param {string} options.environment - 'development' or 'production'
 * @param {number} options.page - Page number (1-based)
 * @param {number} options.limit - Items per page
 * @param {string} options.search - Search query for key names
 * @returns {Promise<{ secrets: Array, total: number, page: number, totalPages: number }>}
 */
async function listSecrets({ environment = 'development', page = 1, limit = 10, search = '' } = {}) {
  try {
    const query = { environment };

    // Search by key name only (case-insensitive)
    if (search && search.trim()) {
      query.key = { $regex: search.trim().toUpperCase(), $options: 'i' };
    }

    const total = await Secret.countDocuments(query);
    const totalPages = Math.ceil(total / limit);
    const skip = (page - 1) * limit;

    const secrets = await Secret.find(query)
      .sort({ key: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    logger.info('secrets listed', `${secrets.length} of ${total} found (env: ${environment}, page ${page})`);
    return { secrets, total, page, totalPages };
  } catch (err) {
    logger.error('list secrets failed', err.message);
    throw err;
  }
}

/**
 * Get paginated secrets with decrypted values, filtered by environment.
 * @param {Object} options
 * @param {string} options.environment - 'development' or 'production'
 * @param {number} options.page - Page number (1-based)
 * @param {number} options.limit - Items per page
 * @param {string} options.search - Search query for key names
 * @returns {Promise<{ secrets: Array, total: number, page: number, totalPages: number }>}
 */
async function getDecryptedSecrets({ environment = 'development', page = 1, limit = 10, search = '' } = {}) {
  try {
    const query = { environment };

    // Search by key name only (case-insensitive)
    if (search && search.trim()) {
      query.key = { $regex: search.trim().toUpperCase(), $options: 'i' };
    }

    const total = await Secret.countDocuments(query);
    const totalPages = Math.ceil(total / limit);
    const skip = (page - 1) * limit;

    const secrets = await Secret.find(query)
      .sort({ key: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const decrypted = secrets.map((secret) => {
      try {
        const plainValue = decrypt({
          value: secret.value,
          iv: secret.iv,
          authTag: secret.authTag,
        });
        return {
          key: secret.key,
          value: plainValue,
          environment: secret.environment,
          description: secret.description || '',
          updatedAt: secret.updatedAt,
        };
      } catch (decryptErr) {
        logger.error(`decrypt failed for key ${secret.key}`, decryptErr.message);
        return {
          key: secret.key,
          value: '[DECRYPTION FAILED]',
          environment: secret.environment,
          description: secret.description || '',
          updatedAt: secret.updatedAt,
        };
      }
    });

    return { secrets: decrypted, total, page, totalPages };
  } catch (err) {
    logger.error('get decrypted secrets failed', err.message);
    throw err;
  }
}

/**
 * Upsert a secret (create or update) for a specific environment.
 * @param {string} key - Secret key (will be uppercased and trimmed).
 * @param {string} value - Plaintext value to encrypt and store.
 * @param {string} description - Optional description.
 * @param {string} environment - 'development' or 'production' (default: 'development').
 */
async function upsertSecret(key, value, description = '', environment = 'development') {
  try {
    const encrypted = encrypt(value);
    const cleanKey = key.toUpperCase().trim();
    const cleanEnv = environment.toLowerCase().trim();

    const secret = await Secret.findOneAndUpdate(
      { key: cleanKey, environment: cleanEnv },
      {
        $set: {
          key: cleanKey,
          environment: cleanEnv,
          value: encrypted.value,
          iv: encrypted.iv,
          authTag: encrypted.authTag,
          description: description || '',
        },
      },
      { upsert: true, new: true, runValidators: true }
    );

    logger.info('secret upserted', `${secret.key} (env: ${secret.environment})`);

    // Regenerate .env.example after every write
    await generateEnvExample();

    return secret;
  } catch (err) {
    logger.error('upsert secret failed', err.message);
    throw err;
  }
}

/**
 * Delete a secret by key and environment.
 * @param {string} key - The key to delete.
 * @param {string} environment - 'development' or 'production'.
 */
async function deleteSecret(key, environment = 'development') {
  try {
    const cleanKey = key.toUpperCase().trim();
    const cleanEnv = environment.toLowerCase().trim();

    const result = await Secret.findOneAndDelete({
      key: cleanKey,
      environment: cleanEnv,
    });

    if (result) {
      logger.info('secret deleted', `${cleanKey} (env: ${cleanEnv})`);
      // Regenerate .env.example after delete
      await generateEnvExample();
    } else {
      logger.warn('secret not found for delete', `${cleanKey} (env: ${cleanEnv})`);
    }

    return result;
  } catch (err) {
    logger.error('delete secret failed', err.message);
    throw err;
  }
}

/**
 * Import secrets from raw .env file text into a specific environment.
 * Uses dotenv's parse function to extract key-value pairs.
 * @param {string} envFileText - The raw text content of a .env file.
 * @param {string} environment - 'development' or 'production' (default: 'development').
 * @returns {Promise<{ imported: number, keys: string[] }>}
 */
async function importFromEnvText(envFileText, environment = 'development') {
  try {
    const dotenv = require('dotenv');
    const parsed = dotenv.parse(envFileText);
    const keys = Object.keys(parsed);
    let imported = 0;

    for (const key of keys) {
      const value = parsed[key];
      if (value) {
        await upsertSecret(key, value, `Imported from .env file`, environment);
        imported++;
      }
    }

    logger.info('secrets imported from env text', `${imported} keys imported (env: ${environment})`);
    return { imported, keys };
  } catch (err) {
    logger.error('import from env text failed', err.message);
    throw err;
  }
}

module.exports = {
  listSecrets,
  getDecryptedSecrets,
  upsertSecret,
  deleteSecret,
  importFromEnvText,
};