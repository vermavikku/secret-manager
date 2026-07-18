/**
 * Secrets controller — thin HTTP handlers that call the service layer.
 */
const secretsService = require('../services/secrets.service');

/**
 * GET /api/secrets
 * Returns paginated secrets with decrypted values.
 * Query params: page, limit, search
 */
async function getAllSecrets(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';

    const result = await secretsService.getDecryptedSecrets({ page, limit, search });
    return res.json({ success: true, ...result });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * POST /api/secrets
 * Create or update a single secret.
 * Body: { key, value, description? }
 */
async function upsertSecret(req, res) {
  try {
    const { key, value, description } = req.body;

    if (!key || !value) {
      return res.status(400).json({
        success: false,
        error: 'key and value are required',
      });
    }

    const secret = await secretsService.upsertSecret(key, value, description);
    return res.json({ success: true, data: { key: secret.key } });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * DELETE /api/secrets/:key
 * Delete a secret by key.
 */
async function deleteSecret(req, res) {
  try {
    const { key } = req.params;
    const result = await secretsService.deleteSecret(key);

    if (!result) {
      return res.status(404).json({
        success: false,
        error: `Secret "${key}" not found`,
      });
    }

    return res.json({ success: true, data: { key: result.key } });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * POST /api/secrets/import
 * Bulk import secrets from raw .env text.
 * Body: { envFileContents }
 */
async function importSecrets(req, res) {
  try {
    const { envFileContents } = req.body;

    if (!envFileContents) {
      return res.status(400).json({
        success: false,
        error: 'envFileContents is required',
      });
    }

    const result = await secretsService.importFromEnvText(envFileContents);
    return res.json({ success: true, data: result });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = {
  getAllSecrets,
  upsertSecret,
  deleteSecret,
  importSecrets,
};