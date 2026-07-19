/**
 * Route index — mounts all route modules under /api.
 */
const express = require('express');
const router = express.Router();
const secretsRoutes = require('./secrets.routes');
const { getConfig } = require('../controllers/config.controller');

router.use('/secrets', secretsRoutes);

// Config endpoint (no auth required — only returns DB name, no secrets)
router.get('/config', getConfig);

module.exports = router;
