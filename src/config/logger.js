/**
 * Minimal console logger with timestamps for key actions.
 */
function getTimestamp() {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

const logger = {
  info(action, details = '') {
    const msg = details ? `${action} — ${details}` : action;
    console.log(`[${getTimestamp()}] [INFO] ${msg}`);
  },

  warn(action, details = '') {
    const msg = details ? `${action} — ${details}` : action;
    console.warn(`[${getTimestamp()}] [WARN] ${msg}`);
  },

  error(action, details = '') {
    const msg = details ? `${action} — ${details}` : action;
    console.error(`[${getTimestamp()}] [ERROR] ${msg}`);
  },
};

module.exports = logger;