/**
 * CLI script: npm run import-env -- /path/to/.env [--env development|production]
 * Reads a real .env file from disk, imports every key into the specified environment,
 * then prints a reminder to delete or archive the original file.
 *
 * Usage:
 *   npm run import-env -- ../.env
 *   npm run import-env -- ../.env.production --env production
 */
const fs = require('fs');
const path = require('path');
const { connectDB, disconnectDB } = require('../src/config/db');
const secretsService = require('../src/services/secrets.service');

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.log('');
    console.log('Usage: npm run import-env -- <path-to-.env> [--env development|production]');
    console.log('');
    console.log('Examples:');
    console.log('  npm run import-env -- ../.env');
    console.log('  npm run import-env -- ../.env.production --env production');
    console.log('');
    process.exit(1);
  }

  // Check for --env flag (must be checked before the file path)
  let environment = 'development';
  let envIndex = args.indexOf('--env');
  let filePath;

  if (envIndex !== -1 && args.length > envIndex + 1) {
    environment = args[envIndex + 1].toLowerCase().trim();
    // Remove --env and its value to find the file path
    args.splice(envIndex, 2);
    filePath = args[0];
  } else {
    filePath = args[0];
  }

  if (environment !== 'development' && environment !== 'production') {
    console.error(`\n✗ Invalid environment "${environment}". Must be "development" or "production".\n`);
    process.exit(1);
  }

  // Resolve the file path relative to the parent project (where secrets-manager lives)
  const resolvedPath = path.resolve(__dirname, '..', filePath);

  if (!fs.existsSync(resolvedPath)) {
    console.error(`\n✗ File not found: ${resolvedPath}\n`);
    process.exit(1);
  }

  try {
    const envFileText = fs.readFileSync(resolvedPath, 'utf8');

    if (!envFileText.trim()) {
      console.error(`\n✗ File is empty: ${resolvedPath}\n`);
      process.exit(1);
    }

    console.log(`\nImporting secrets from ${filePath} into "${environment}"...`);

    await connectDB();
    const result = await secretsService.importFromEnvText(envFileText, environment);

    console.log(`\n✓ Successfully imported ${result.imported} keys:`);
    result.keys.forEach((key) => console.log(`  • ${key}`));
    console.log(`\n⚠️  REMINDER: The original file "${filePath}" still contains real plaintext secrets.`);
    console.log(`   Delete or archive it now:`);
    console.log(`   rm "${filePath}"`);
    console.log('');

    await disconnectDB();
    process.exit(0);
  } catch (err) {
    console.error(`\n✗ Failed to import: ${err.message}\n`);
    await disconnectDB();
    process.exit(1);
  }
}

main();