/**
 * Centralized Logging Utility
 * Replaces console.log with proper structured logging
 */

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

const logger = {
    info: (message, meta) => {
        const log = formatLog('INFO', message, meta);
        console.log(log.trim());
        writeToFile(ACCESS_LOG, log);
    },

    warn: (message, meta) => {
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

    debug: (message, meta) => {
        if (process.env.NODE_ENV !== 'production') {
            const log = formatLog('DEBUG', message, meta);
            console.log(log.trim());
        }
    },

    // Authentication specific logging
    auth: (action, meta) => {
        const log = formatLog('AUTH', action, {
            ...meta,
            ip: meta.ip || 'unknown',
            userId: meta.userId || 'anonymous'
        });
        console.log(log.trim());
        writeToFile(ACCESS_LOG, log);
    }
};

module.exports = logger;
