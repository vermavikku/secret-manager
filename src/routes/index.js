/**
 * Route index — mounts all route modules under /api.
 */
const express = require('express');
const router = express.Router();
const secretsRoutes = require('./secrets.routes');

router.use('/secrets', secretsRoutes);

module.exports = router;