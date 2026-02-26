/**
 * Role-Based Access Control Middleware
 * Ensures users have the required role before executing protected actions
 */

const logger = require('../utils/logger');

/**
 * Middleware factory for role-based access
 * @param {string[]} allowedRoles - Array of allowed roles (e.g., ['admin', 'bursary'])
 */
const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        const userRole = req.userRole;

        if (!userRole) {
            logger.warn('Role check failed - no role found', {
                path: req.path,
                method: req.method,
                userId: req.user?.id,
                ip: req.ip
            });
            return res.status(401).json({
                error: 'Authentication required',
                code: 'UNAUTHORIZED'
            });
        }

        if (!allowedRoles.includes(userRole)) {
            logger.warn('Role check failed - insufficient permissions', {
                path: req.path,
                method: req.method,
                userRole,
                requiredRoles: allowedRoles,
                userId: req.user?.id,
                ip: req.ip
            });
            return res.status(403).json({
                error: 'You do not have permission to perform this action',
                code: 'FORBIDDEN'
            });
        }

        next();
    };
};

/**
 * Middleware to ensure user is an admin
 */
const requireAdmin = requireRole('admin');

/**
 * Middleware to ensure user is admin or bursary (for finance operations)
 */
const requireAdminOrBursary = requireRole('admin', 'bursary');

/**
 * Middleware to ensure user is admin or teacher
 */
const requireAdminOrTeacher = requireRole('admin', 'teacher');

module.exports = {
    requireRole,
    requireAdmin,
    requireAdminOrBursary,
    requireAdminOrTeacher
};
