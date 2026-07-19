const net = require('net');

/**
 * Checks if a given port is free to bind on the given host.
 */
function isPortFree(port, host) {
  return new Promise((resolve) => {
    const tester = net.createServer();

    tester.once('error', () => resolve(false)); // port is taken
    tester.once('listening', () => {
      tester.close(() => resolve(true));
    });

    tester.listen(port, host);
  });
}

/**
 * Starting from `startPort`, tries each port in order until it finds
 * one that's free, then returns it. Prevents EADDRINUSE crashes when
 * multiple secrets-manager copies (one per project) run at the same time.
 */
async function findAvailablePort(startPort, host = '127.0.0.1', maxAttempts = 20) {
  for (let port = startPort; port < startPort + maxAttempts; port++) {
    // eslint-disable-next-line no-await-in-loop
    if (await isPortFree(port, host)) {
      return port;
    }
  }
  throw new Error(
    `Could not find a free port between ${startPort} and ${startPort + maxAttempts - 1} on ${host}`
  );
}

module.exports = findAvailablePort;