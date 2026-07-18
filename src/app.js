/**
 * Express application setup.
 * - express.json() body parser
 * - serves public/ as static files
 * - mounts API routes under /api with Basic Auth
 */
const express = require('express');
const path = require('path');
const basicAuth = require('./middleware/basicAuth.middleware');
const apiRoutes = require('./routes/index');

const app = express();

// Body parser
app.use(express.json({ limit: '10mb' }));

// Static files (admin UI)
app.use(express.static(path.resolve(__dirname, '../public')));

// API routes with Basic Auth
app.use('/api', basicAuth, apiRoutes);

module.exports = app;