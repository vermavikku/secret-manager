/**
 * Server entry point.
 * Connects to MongoDB, then starts the Express app on the configured PORT.
 * Binds to 127.0.0.1 only (not 0.0.0.0) for security.
 */
const config = require('./config/env');
const { connectDB } = require('./config/db');
const logger = require('./config/logger');
const app = require('./app');

const HOST = '127.0.0.1';
const PORT = config.PORT;

async function start() {
  try {
    // Connect to MongoDB first
    await connectDB();

    // Start Express server
    const server = app.listen(PORT, HOST, () => {
      logger.info('UI started', `http://${HOST}:${PORT}`);
      console.log('');
      console.log(`  ╔══════════════════════════════════════════╗`);
      console.log(`  ║  Secrets Manager is running              ║`);
      console.log(`  ║                                        ║`);
      console.log(`  ║  Local:  http://${HOST}:${PORT}          ║`);
      console.log(`  ║                                        ║`);
      console.log(`  ║  Log in with your ADMIN_USER/           ║`);
      console.log(`  ║  ADMIN_PASSWORD credentials             ║`);
      console.log(`  ╚══════════════════════════════════════════╝`);
      console.log('');
    });

    // Graceful shutdown
    const shutdown = async () => {
      logger.info('shutting down server');
      server.close(async () => {
        const { disconnectDB } = require('./config/db');
        await disconnectDB();
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (err) {
    logger.error('failed to start server', err.message);
    process.exit(1);
  }
}

start();