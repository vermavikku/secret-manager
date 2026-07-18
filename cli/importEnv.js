/**
 * CLI script: npm run import-env -- /path/to/.env
 * Reads a real .env file from disk, imports every key via the service layer,
 * then prints a reminder to delete or archive the original file.
 *
 * Usage:
 *   npm run import-env -- ../.env
 *   npm run import-env -- /full/path/to/.env
 */
const fs = require('fs');
const path = require('path');
const { connectDB, disconnectDB } = require('../src/config/db');
const secretsService = require('../src/services/secrets.service');

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.log('');
    console.log('Usage: npm run import-env -- <path-to-env-file>');
    console.log('');
    console.log('Examples:');
    console.log('  npm run import-env -- ../.env');
    console.log('  npm run import-env -- /path/to/project/.env');
    console.log('');
    process.exit(1);
  }

  const envPath = path.resolve(process.cwd(), args[0]);

  // Check if file exists
  if (!fs.existsSync(envPath)) {
    console.error(`\n✗ File not found: ${envPath}\n`);
    process.exit(1);
  }

  try {
    const envFileText = fs.readFileSync(envPath, 'utf8');

    if (!envFileText.trim()) {
      console.error(`\n✗ File is empty: ${envPath}\n`);
      process.exit(1);
    }

    await connectDB();
    const result = await secretsService.importFromEnvText(envFileText);
    await disconnectDB();

    console.log(`\n✓ Successfully imported ${result.imported} secrets:`);
    result.keys.forEach((key) => console.log(`  • ${key}`));

    console.log('');
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║  IMPORTANT: Delete or archive the original .env file!      ║');
    console.log('║                                                              ║');
    console.log(`║  File: ${envPath.padEnd(55)}║`);
    console.log('║                                                              ║');
    console.log('║  It still contains real plaintext secrets.                   ║');
    console.log('║  Your secrets are now safely encrypted in MongoDB.           ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log('');

    process.exit(0);
  } catch (err) {
    console.error(`\n✗ Failed to import .env file: ${err.message}\n`);
    await disconnectDB();
    process.exit(1);
  }
}

main();