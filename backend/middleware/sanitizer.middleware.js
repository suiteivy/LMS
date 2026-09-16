/**
 * Middleware to sanitize incoming request data.
 * 1. Recursively converts literal string "null" / "undefined" into null.
 * 2. Sanitizes string inputs to prevent XSS (stripping script/iframe tags, onerror/onload attributes)
 *    while preserving sensitive credential fields (passwords, tokens).
 */

function sanitizeString(str) {
    if (typeof str !== 'string') return str;
    if (str === "null" || str === "undefined") return null;

    // Remove script tags, iframes, and javascript: protocols
    return str
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
        .replace(/javascript:[^\s"']+/gi, '')
        .replace(/\bonerror\s*=/gi, 'noerror=')
        .replace(/\bonload\s*=/gi, 'noload=');
}

function sanitizeValue(value, key = '') {
    if (typeof value === 'string') {
        if (key && /password|token|secret/i.test(key)) {
            return (value === "null" || value === "undefined") ? null : value;
        }
        return sanitizeString(value);
    }

    if (Array.isArray(value)) {
        return value.map(item => sanitizeValue(item, key));
    }

    if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
        for (const k in value) {
            if (Object.prototype.hasOwnProperty.call(value, k)) {
                value[k] = sanitizeValue(value[k], k);
            }
        }
    }

    return value;
}

const nullStringSanitizer = (req, res, next) => {
    if (req.body) {
        req.body = sanitizeValue(req.body);
    }
    if (req.query) {
        req.query = sanitizeValue(req.query);
    }
    if (req.params) {
        req.params = sanitizeValue(req.params);
    }
    next();
};

module.exports = { nullStringSanitizer };

