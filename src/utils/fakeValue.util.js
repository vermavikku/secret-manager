/**
 * Returns a believable fake placeholder value based on key name pattern-matching.
 * Used to generate safe-to-commit .env.example files.
 */

function getFakeValue(key) {
  const upperKey = key.toUpperCase();

  // Keys containing common secret-related terms
  if (/KEY|SECRET|TOKEN|PASSWORD|PASSWD|PASS|SALT|HASH/.test(upperKey)) {
    return 'CHANGE_ME_xxxxxxxxxxxxxxxx';
  }

  // Keys containing API-related terms
  if (/API_KEY|API_SECRET|API_TOKEN/.test(upperKey)) {
    return 'CHANGE_ME_xxxxxxxxxxxxxxxx';
  }

  // URLs and URIs
  if (/URL|URI|ENDPOINT|HOST|BASE|DOMAIN/.test(upperKey)) {
    return 'https://example.com';
  }

  // Port numbers
  if (/PORT/.test(upperKey)) {
    return '3000';
  }

  // Email addresses
  if (/EMAIL|MAIL/.test(upperKey)) {
    return 'user@example.com';
  }

  // File paths
  if (/PATH|DIR|DIRECTORY|FOLDER|FILE/.test(upperKey)) {
    return '/path/to/something';
  }

  // Database names/URIs
  if (/DB_|DATABASE|MONGODB|MONGO|POSTGRES|MYSQL|REDIS/.test(upperKey)) {
    return 'localhost';
  }

  // Boolean-like values
  if (/ENABLED|DISABLED|ACTIVE|DEBUG|LOG_LEVEL/.test(upperKey)) {
    return 'true';
  }

  // Default fallback
  return 'CHANGE_ME';
}

module.exports = { getFakeValue };