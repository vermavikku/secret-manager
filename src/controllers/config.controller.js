/**
 * Config controller — returns app configuration info.
 */
const { MONGO_URI } = require('../config/db');

/**
 * GET /api/config
 * Returns the current database name and connection info.
 */
function getConfig(req, res) {
  try {
    // Extract database name from MONGO_URI
    const dbName = MONGO_URI.split('/').pop();
    
    // Extract host info (remove protocol and db name)
    const hostPart = MONGO_URI.replace(/^mongodb:\/\//, '').replace(/\/.*$/, '');
    
    return res.json({
      success: true,
      data: {
        databaseName: dbName,
        host: hostPart,
        fullUri: MONGO_URI,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = { getConfig };