/**
 * AES-256-GCM encryption/decryption utilities.
 * Uses Node's built-in crypto module. Key is sourced from config/env.js.
 */
const crypto = require('crypto');
const config = require('../config/env');

const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(config.ENCRYPTION_KEY, 'hex');

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * @param {string} plainText - The value to encrypt.
 * @returns {{ value: string, iv: string, authTag: string }} Base64-encoded cipher components.
 */
function encrypt(plainText) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);

  let encrypted = cipher.update(plainText, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  const authTag = cipher.getAuthTag();

  return {
    value: encrypted,
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
  };
}

/**
 * Decrypts an encrypted payload using AES-256-GCM.
 * @param {{ value: string, iv: string, authTag: string }} encrypted - The cipher components.
 * @returns {string} The decrypted plaintext.
 */
function decrypt(encrypted) {
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    KEY,
    Buffer.from(encrypted.iv, 'base64')
  );
  decipher.setAuthTag(Buffer.from(encrypted.authTag, 'base64'));

  let decrypted = decipher.update(encrypted.value, 'base64', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

module.exports = { encrypt, decrypt };