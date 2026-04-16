/**
 * Middleware to sanitize incoming request data.
 * It recursively converts any literal string "null" into an actual null value.
 * This prevents UUID syntax errors when the frontend sends "null" for optional UUID fields.
 */

function sanitizeValue(value) {
    if (value === "null" || value === "undefined") {
        return null;
    }
    
    // Also handle cases where "null" might be inside an array
    if (Array.isArray(value)) {
        return value.map(item => sanitizeValue(item));
    }
    
    // Recursively sanitize objects
    if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
        for (const key in value) {
            if (Object.prototype.hasOwnProperty.call(value, key)) {
                value[key] = sanitizeValue(value[key]);
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
