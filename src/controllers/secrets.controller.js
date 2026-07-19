/**
 * Secrets controller — thin HTTP handlers that call the service layer.
 * All handlers now accept environment from query or body.
 */
const secretsService = require('../services/secrets.service');

/**
 * GET /api/secrets
 * Returns paginated secrets with decrypted values.
 * Query params: page, limit, search, environment
 */
async function getAllSecrets(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const environment = req.query.environment || 'development';

    const result = await secretsService.getDecryptedSecrets({ environment, page, limit, search });
    return res.json({ success: true, ...result });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * POST /api/secrets
 * Create or update a single secret for a specific environment.
 * Body: { key, value, description?, environment? }
 */
async function upsertSecret(req, res) {
  try {
    const { key, value, description, environment } = req.body;

    if (!key || !value) {
      return res.status(400).json({
        success: false,
        error: 'key and value are required',
      });
    }

    const secret = await secretsService.upsertSecret(key, value, description, environment);
    return res.json({ success: true, data: { key: secret.key, environment: secret.environment } });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * DELETE /api/secrets/:key
 * Delete a secret by key and environment.
 * Query params: environment
 */
async function deleteSecret(req, res) {
  try {
    const { key } = req.params;
    const environment = req.query.environment || 'development';
    const result = await secretsService.deleteSecret(key, environment);

    if (!result) {
      return res.status(404).json({
        success: false,
        error: `Secret "${key}" not found in ${environment}`,
      });
    }

    return res.json({ success: true, data: { key: result.key, environment: result.environment } });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * POST /api/secrets/import
 * Bulk import secrets from raw .env text into a specific environment.
 * Body: { envFileContents, environment? }
 */
async function importSecrets(req, res) {
  try {
    const { envFileContents, environment } = req.body;

    if (!envFileContents) {
      return res.status(400).json({
        success: false,
        error: 'envFileContents is required',
      });
    }

    const result = await secretsService.importFromEnvText(envFileContents, environment);
    return res.json({ success: true, data: result });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * GET /api/secrets/export
 * Export secrets for a specific environment as a .env file.
 * Query params: environment
 */
async function exportSecrets(req, res) {
  try {
    const environment = req.query.environment || 'development';
    const result = await secretsService.getDecryptedSecrets({ environment, page: 1, limit: 1000 });
    
    if (!result.secrets || result.secrets.length === 0) {
      return res.status(404).json({ success: false, error: `No secrets found for ${environment}` });
    }

    // Build .env file content
    const lines = result.secrets.map((secret) => {
      // Escape special characters in values
      const escapedValue = secret.value.includes(' ') || secret.value.includes('#') || secret.value.includes('"')
        ? `"${secret.value.replace(/"/g, '\\"')}"`
        : secret.value;
      return `${secret.key}=${escapedValue}`;
    });

    const envContent = lines.join('\n') + '\n';
    const filename = `.env.${environment}`;

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('X-Environment', environment);
    res.setHeader('X-Secret-Count', result.secrets.length.toString());
    
    return res.send(envContent);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = {
  getAllSecrets,
  upsertSecret,
  deleteSecret,
  importSecrets,
  exportSecrets,
};
