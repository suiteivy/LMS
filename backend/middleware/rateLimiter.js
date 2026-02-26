/**
 * Rate Limiting Middleware
 * Implements IP-based and user-based rate limiting
 */

const logger = require('../utils/logger');

// In-memory store for rate limiting (use Redis in production)
const rateLimitStore = new Map();

// Cleanup interval - remove expired entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of rateLimitStore.entries()) {
        if (value.expiresAt < now) {
            rateLimitStore.delete(key);
        }
    }
}, 5 * 60 * 1000);

/**
 * Create a rate limiter middleware
 * @param {Object} options - Rate limit options
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.maxRequests - Maximum requests per window
 * @param {string} options.keyPrefix - Prefix for rate limit key
 * @param {boolean} options.skipSuccessfulRequests - Skip counting successful requests
 * @param {boolean} options.differentiateByUser - Also limit by user ID when available
 */
const createRateLimiter = (options = {}) => {
    const {
        windowMs = 60 * 1000, // 1 minute default
        maxRequests = 100,
        keyPrefix = 'rl',
        differentiateByUser = false
    } = options;

    return (req, res, next) => {
        const ip = req.ip || req.connection.remoteAddress || 'unknown';
        const userId = differentiateByUser && req.user ? req.user.id : null;

        // Build the key
        const key = userId
            ? `${keyPrefix}:${ip}:${userId}`
            : `${keyPrefix}:${ip}`;

        const now = Date.now();
        const windowStart = now - windowMs;

        // Get current request history
        let requestHistory = rateLimitStore.get(key) || {
            count: 0,
            requests: [],
            expiresAt: now + windowMs
        };

        // Filter out old requests outside the window
        requestHistory.requests = requestHistory.requests.filter(t => t > windowStart);
        requestHistory.count = requestHistory.requests.length;

        // Check if limit exceeded
        if (requestHistory.count >= maxRequests) {
            logger.warn('Rate limit exceeded', {
                ip,
                userId,
                key: keyPrefix,
                count: requestHistory.count,
                limit: maxRequests
            });

            return res.status(429).json({
                error: 'Too many requests. Please try again later.',
                code: 'RATE_LIMIT_EXCEEDED',
                retryAfter: Math.ceil(windowMs / 1000)
            });
        }

        // Add current request
        requestHistory.requests.push(now);
        requestHistory.count++;
        requestHistory.expiresAt = now + windowMs;
        rateLimitStore.set(key, requestHistory);

        // Set rate limit headers
        res.set('X-RateLimit-Limit', maxRequests);
        res.set('X-RateLimit-Remaining', Math.max(0, maxRequests - requestHistory.count));
        res.set('X-RateLimit-Reset', Math.ceil(requestHistory.expiresAt / 1000));

        next();
    };
};

// Pre-configured rate limiters
const rateLimiters = {
    // Strict limit for auth endpoints (login, password reset)
    auth: createRateLimiter({
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 20,
        keyPrefix: 'auth',
        differentiateByUser: true
    }),

    // Very strict limit for password reset (3 per hour per email)
    passwordReset: createRateLimiter({
        windowMs: 60 * 60 * 1000, // 1 hour
        maxRequests: 3,
        keyPrefix: 'pwreset',
        differentiateByUser: true
    }),

    // Moderate limit for general API
    api: createRateLimiter({
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 100,
        keyPrefix: 'api'
    }),

    // Strict limit for write operations
    write: createRateLimiter({
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 30,
        keyPrefix: 'write'
    })
};

module.exports = {
    createRateLimiter,
    rateLimiters
};
