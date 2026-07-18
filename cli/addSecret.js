/**
 * CLI script: npm run add-secret -- KEY value [description] [--env development|production]
 * Encrypts and upserts one secret for a specific environment, then exits cleanly.
 *
 * Usage:
 *   npm run add-secret -- MY_API_KEY sk-abc123
 *   npm run add-secret -- "DATABASE_URL" "mongodb://user:pass@localhost/myapp" --env production
 *   npm run add-secret -- JWT_SECRET mysupersecret "JWT signing key" --env production
 */
const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../src/config/db');
const secretsService = require('../src/services/secrets.service');

async function main() {
  // Parse arguments: skip first two (node, script path)
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log('');
    console.log('Usage: npm run add-secret -- <KEY> <value> [description] [--env development|production]');
    console.log('');
    console.log('Examples:');
    console.log('  npm run add-secret -- MY_API_KEY sk-abc123');
    console.log('  npm run add-secret -- "DATABASE_URL" "mongodb://..." --env production');
    console.log('  npm run add-secret -- JWT_SECRET mysupersecret "JWT signing key"');
    console.log('');
    process.exit(1);
  }

  // Check for --env flag
  let environment = 'development';
  let envIndex = args.indexOf('--env');
  if (envIndex !== -1 && args.length > envIndex + 1) {
    environment = args[envIndex + 1].toLowerCase().trim();
    // Remove --env and its value from args
    args.splice(envIndex, 2);
  }

  const key = args[0];
  const value = args[1];
  const description = args.slice(2).join(' ') || '';

  if (environment !== 'development' && environment !== 'production') {
    console.error(`\n✗ Invalid environment "${environment}". Must be "development" or "production".\n`);
    process.exit(1);
  }

  try {
    await connectDB();
    await secretsService.upsertSecret(key, value, description, environment);
    console.log(`\n✓ Secret "${key.toUpperCase()}" saved to ${environment}.\n`);
    await disconnectDB();
    process.exit(0);
  } catch (err) {
    console.error(`\n✗ Failed to add secret: ${err.message}\n`);
    await disconnectDB();
    process.exit(1);
  }
}

main();