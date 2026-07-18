/**
 * Environment variable validation and configuration.
 * Reads ENCRYPTION_KEY, ADMIN_USER, ADMIN_PASSWORD, and PORT from process.env.
 * dotenv is loaded here so all modules that require this file get env vars.
 */
const path = require('path');
const dotenv = require('dotenv');

// Load .env from the secrets-manager root directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Also load .env from the parent project (the app using secrets-manager)
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const config = {
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || '',
  ADMIN_USER: process.env.ADMIN_USER || 'admin',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'admin',
  PORT: parseInt(process.env.PORT || '4321', 10),
};

/**
 * Validates that ENCRYPTION_KEY is a 64-character hex string.
 * This is the one real secret this tool needs — it must be set in the shell profile,
 * never in a project file.
 */
function validateConfig() {
  const hexRegex = /^[0-9a-fA-F]{64}$/;

  if (!config.ENCRYPTION_KEY) {
    console.error('');
    console.error('╔══════════════════════════════════════════════════════════════╗');
    console.error('║  ENCRYPTION_KEY is missing!                                ║');
    console.error('╠══════════════════════════════════════════════════════════════╣');
    console.error('║  You must export ENCRYPTION_KEY in your shell profile:      ║');
    console.error('║  ~/.zshrc or ~/.bashrc                                      ║');
    console.error('║                                                              ║');
    console.error('║  Generate one with:                                          ║');
    console.error('║  node -e "console.log(require(\'crypto\').randomBytes(32)    ║');
    console.error('║    .toString(\'hex\'))"                                      ║');
    console.error('║                                                              ║');
    console.error('║  Then add to your shell profile:                             ║');
    console.error('║  export ENCRYPTION_KEY="<the-64-char-hex-string>"           ║');
    console.error('║                                                              ║');
    console.error('║  Restart your terminal or run: source ~/.zshrc               ║');
    console.error('╚══════════════════════════════════════════════════════════════╝');
    console.error('');
    process.exit(1);
  }

  if (!hexRegex.test(config.ENCRYPTION_KEY)) {
    console.error('');
    console.error('╔══════════════════════════════════════════════════════════════╗');
    console.error('║  ENCRYPTION_KEY is invalid!                                 ║');
    console.error('╠══════════════════════════════════════════════════════════════╣');
    console.error('║  It must be a 64-character hex string (32 bytes).           ║');
    console.error('║  Current value length: ' + config.ENCRYPTION_KEY.length.toString().padEnd(40) + '║');
    console.error('║                                                              ║');
    console.error('║  Generate a valid one with:                                  ║');
    console.error('║  node -e "console.log(require(\'crypto\').randomBytes(32)    ║');
    console.error('║    .toString(\'hex\'))"                                      ║');
    console.error('╚══════════════════════════════════════════════════════════════╝');
    console.error('');
    process.exit(1);
  }
}

validateConfig();

module.exports = config;