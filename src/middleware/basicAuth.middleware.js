/**
 * HTTP Basic Authentication middleware.
 * Uses ADMIN_USER and ADMIN_PASSWORD from config/env.js.
 * Applied to all /api routes.
 */
const config = require('../config/env');

function basicAuth(req, res, next) {
  // Skip auth for non-API routes (static files)
  if (!req.path.startsWith('/api')) {
    return next();
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Secrets Manager"');
    return res.status(401).json({ error: 'Authentication required' });
  }

  const base64Credentials = authHeader.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('utf8');
  const [username, password] = credentials.split(':');

  if (username === config.ADMIN_USER && password === config.ADMIN_PASSWORD) {
    return next();
  }

  res.setHeader('WWW-Authenticate', 'Basic realm="Secrets Manager"');
  return res.status(401).json({ error: 'Invalid credentials' });
}

module.exports = basicAuth;