// backend/src/utils/logger.js
const ts = () => new Date().toISOString();

const logger = {
  info: (...a) => console.log(`[INFO ] ${ts()}`, ...a),
  warn: (...a) => console.warn(`[WARN ] ${ts()}`, ...a),
  error: (...a) => console.error(`[ERROR] ${ts()}`, ...a),
};

// Export BOTH ways so either import style works:
module.exports = logger;              // const logger = require(...)
module.exports.logger = logger;       // const { logger } = require(...)