const metricsCollector = require('../utils/metrics.js');

/**
 * Express middleware to capture latency, traffic, and status codes
 * for the 4 Golden Signals.
 */
const metricsMiddleware = (req, res, next) => {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1e6;
    metricsCollector.recordRequest(Math.round(durationMs * 100) / 100, res.statusCode);
  });

  next();
};

module.exports = metricsMiddleware;
