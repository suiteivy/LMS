/**
 * Centralized Logging Utility
 * Replaces console.log with proper structured logging.
 *
 * Includes a throttled logger (logger.throttle) that suppresses
 * repeated identical log keys within a configurable window — preventing
 * high-frequency transient errors (e.g. fetch failed, circuit open) from
 * flooding stdout/stderr and overloading the server.
 */

const process = require("node:process");
const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '..', 'logs');
const ERROR_LOG = path.join(LOG_DIR, 'error.log');
const ACCESS_LOG = path.join(LOG_DIR, 'access.log');

// Ensure logs directory exists
if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}

const formatLog = (level, message, meta = {}) => {
    const timestamp = new Date().toISOString();
    return JSON.stringify({
        timestamp,
        level,
        message,
        ...meta
    }) + '\n';
};

const writeToFile = (filePath, content) => {
    fs.appendFile(filePath, content, (err) => {
        if (err) console.error('Failed to write to log file:', err);
    });
};

// ---------------------------------------------------------------------------
// Throttle map — tracks { firstSeenAt, count, lastLoggedAt } per key.
// Keys are caller-supplied strings (e.g. '[AuthMiddleware] transient').
// ---------------------------------------------------------------------------
const _throttleMap = new Map();

/**
 * Suppress repeated log entries with the same `key` within `windowMs`.
 * On the FIRST occurrence: logs immediately.
 * On subsequent occurrences within the window: silently counts them.
 * When the window expires: logs a summary ("suppressed N times") and resets.
 *
 * @param {'error'|'warn'|'info'} level
 * @param {string} key   — stable identifier for this log site (not the full message)
 * @param {string} message — full human-readable message
 * @param {object} [meta]
 * @param {number} [windowMs=60000] — suppression window in ms (default 1 min)
 */
const throttle = (level, key, message, meta = {}, windowMs = 60_000) => {
    const now = Date.now();
    const entry = _throttleMap.get(key);

    if (!entry) {
        // First occurrence — log immediately and open a window.
        _throttleMap.set(key, { firstSeenAt: now, count: 1, lastLoggedAt: now });
        logger[level](message, meta);
        return;
    }

    const elapsed = now - entry.lastLoggedAt;

    if (elapsed >= windowMs) {
        // Window expired — emit a summary if anything was suppressed, then reset.
        const suppressed = entry.count - 1;
        const summary = suppressed > 0
            ? `${message} [+${suppressed} suppressed in last ${Math.round(elapsed / 1000)}s]`
            : message;
        _throttleMap.set(key, { firstSeenAt: now, count: 1, lastLoggedAt: now });
        logger[level](summary, meta);
    } else {
        // Still within the window — suppress but count.
        entry.count += 1;
    }
};

// Periodically evict stale entries (older than 10 min) to prevent memory leak.
const _EVICT_MS = 10 * 60 * 1000;
setInterval(() => {
    const cutoff = Date.now() - _EVICT_MS;
    for (const [key, entry] of _throttleMap.entries()) {
        if (entry.lastLoggedAt < cutoff) _throttleMap.delete(key);
    }
}, _EVICT_MS).unref(); // .unref() so it doesn't block process exit

const logger = {
    info: (message, meta = {}) => {
        // Silence internal access logs completely
        if (meta && meta.type === 'access') return; 
        if (typeof message === 'string' && message.includes('GET /api/')) return;
        if (typeof message === 'string' && message.includes('POST /api/')) return;
        if (typeof message === 'string' && message.includes('PUT /api/')) return;
        if (typeof message === 'string' && message.includes('PATCH /api/')) return;
        if (typeof message === 'string' && message.includes('DELETE /api/')) return;
        
        const log = formatLog('INFO', message, meta);
        writeToFile(ACCESS_LOG, log);
    },

    warn: (message, meta = {}) => {
        if (meta && meta.type === 'access') return; // Silence internal access logs completely
        const log = formatLog('WARN', message, meta);
        console.warn(log.trim());
        writeToFile(ACCESS_LOG, log);
    },

    error: (message, meta = {}) => {
        // Always log full error details server-side
        const errorMeta = {
            ...meta,
            stack: meta.stack || null,
            ...(meta.error && {
                errorMessage: meta.error.message,
                errorStack: meta.error.stack
            })
        };
        const log = formatLog('ERROR', message, errorMeta);
        console.error(log.trim());
        writeToFile(ERROR_LOG, log);
    },

    debug: (message, meta = {}) => {
        if (process.env.NODE_ENV !== 'production') {
            const log = formatLog('DEBUG', message, meta);
        }
    },

    // Authentication specific logging
    auth: (action, meta = {}) => {
        const log = formatLog('AUTH', action, {
            ...meta,
            ip: meta.ip || 'unknown',
            userId: meta.userId || 'anonymous'
        });
        writeToFile(ACCESS_LOG, log);
    },

    /**
     * Throttled logging — call this for any high-frequency log site.
     *
     * Usage:
     *   logger.throttle('warn', '[AuthMiddleware] transient', `Supabase unavailable for ${req.url}`, { code });
     *   logger.throttle('error', 'getMaintenanceStatus:transient', message, meta, 30_000);
     *
     * @param {'error'|'warn'|'info'} level
     * @param {string} key   — stable, unique identifier for this log site
     * @param {string} message
     * @param {object} [meta]
     * @param {number} [windowMs=60000]
     */
    throttle,
};

module.exports = logger;
