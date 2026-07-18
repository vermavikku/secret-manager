/**
 * CLI script: npm run add-secret -- KEY value
 * Encrypts and upserts one secret, then exits cleanly.
 *
 * Usage:
 *   npm run add-secret -- MY_API_KEY sk-abc123
 *   npm run add-secret -- "DATABASE_URL" "mongodb://user:pass@localhost/myapp"
 */
const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../src/config/db');
const secretsService = require('../src/services/secrets.service');

async function main() {
  // Parse arguments: skip first two (node, script path)
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log('');
    console.log('Usage: npm run add-secret -- <KEY> <value>');
    console.log('');
    console.log('Examples:');
    console.log('  npm run add-secret -- MY_API_KEY sk-abc123');
    console.log('  npm run add-secret -- "DATABASE_URL" "mongodb://..."');
    console.log('  npm run add-secret -- JWT_SECRET mysupersecret "JWT signing key"');
    console.log('');
    process.exit(1);
  }

  const key = args[0];
  const value = args[1];
  const description = args.slice(2).join(' ') || '';

  try {
    await connectDB();
    await secretsService.upsertSecret(key, value, description);
    console.log(`\n✓ Secret "${key.toUpperCase()}" saved successfully.\n`);
    await disconnectDB();
    process.exit(0);
  } catch (err) {
    console.error(`\n✗ Failed to add secret: ${err.message}\n`);
    await disconnectDB();
    process.exit(1);
  }
}

main();