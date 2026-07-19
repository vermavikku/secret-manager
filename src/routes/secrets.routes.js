/**
 * Secrets REST routes.
 */
const express = require('express');
const router = express.Router();
const secretsController = require('../controllers/secrets.controller');

// GET /api/secrets — list all secrets with decrypted values
router.get('/', secretsController.getAllSecrets);

// POST /api/secrets — add or update a single secret
router.post('/', secretsController.upsertSecret);

// POST /api/secrets/import — bulk import from .env text
router.post('/import', secretsController.importSecrets);

// GET /api/secrets/export — export secrets as .env file
router.get('/export', secretsController.exportSecrets);

// DELETE /api/secrets/:key — delete a secret by key
// NOTE: Must come AFTER /import and /export so they aren't caught by :key
router.delete('/:key', secretsController.deleteSecret);

module.exports = router;
