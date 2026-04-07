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

/**
 * Middleware to ensure user is a Master Platform Admin.
 * They must have the 'admin' role AND NO institution_id assigned.
 */
const requirePlatformAdmin = async (req, res, next) => {
    // Check for the dedicated master_admin role or legacy platform admin flags
    if (req.userRole !== 'master_admin' && (!req.isPlatformAdmin || req.userRole !== 'admin' || req.institution_id !== null)) {
        logger.warn('Platform Admin check failed - unauthorized', {
            path: req.path,
            userId: req.user?.id,
            role: req.userRole,
            institutionId: req.institution_id
        });
        return res.status(403).json({
            error: 'You do not have platform admin privileges',
            code: 'FORBIDDEN'
        });
    }

    // Double check against platform_admins table for strict isolation
    const supabase = require("../utils/supabaseClient");
    const { data: platAdmin } = await supabase
        .from("platform_admins")
        .select("id")
        .eq("id", req.user.id)
        .single();

    if (!platAdmin) {
        logger.warn('Platform Admin check failed - not in platform_admins table', {
            path: req.path,
            userId: req.user?.id
        });
        return res.status(403).json({
            error: 'Platform admin account verified but not found in control registry',
            code: 'FORBIDDEN'
        });
    }

    next();
};

module.exports = {
    requireRole,
    requireAdmin,
    requireAdminOrBursary,
    requireAdminOrTeacher,
    requirePlatformAdmin
};
