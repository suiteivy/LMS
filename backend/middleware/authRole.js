// backend/middleware/authRole.js
/**
 * Middleware to check if the authenticated user has one of the allowed roles.
 * Works with CommonJS `require` and expects `req.user.role` set by auth.middleware.
 *
 * @param {string[]} roles - array of allowed role names, e.g. ['admin', 'teacher']
 * @returns {(req, res, next) => void}
 */
function authorizeRoles(roles = []) {
  return (req, res, next) => {
    try {
      const user = req.user; // comes from auth middleware (must run before this)

      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      let isAllowed = roles.includes(user.role);

      // Check custom roles as well (case-insensitive and handling bursary/bursar normalization)
      if (!isAllowed && user.roles && user.roles.length > 0) {
        const normalizedUserRoles = user.roles.map(r => {
          const roleLower = r.toLowerCase();
          if (roleLower === 'bursar') return 'bursary';
          return roleLower;
        });
        isAllowed = roles.some(r => normalizedUserRoles.includes(r.toLowerCase()));
      }

      // Master Admins inherit standard 'admin' route privileges 
      if (!isAllowed && user.role === 'master_admin' && roles.includes('admin')) {
        isAllowed = true;
      }

      if (!isAllowed) {
        return res
          .status(403)
          .json({ error: "Access denied: insufficient permissions" });
      }

      next();
    } catch (err) {
      console.error("authorizeRoles error:", err);
      res.status(500).json({ error: "Authorization error" });
    }
  };
}

/**
 * Middleware to check if the authenticated user has all of the required granular permissions.
 *
 * @param {string[]} requiredPermissions - array of required permission names
 * @returns {(req, res, next) => void}
 */
function authorizePermissions(requiredPermissions = []) {
  return (req, res, next) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Master admin always has all permissions
      if (user.role === 'master_admin' || user.is_platform_admin) {
        return next();
      }

      // Check if user has all required permissions
      const userPerms = user.permissions || [];
      const hasAll = requiredPermissions.every(perm => userPerms.includes(perm));

      if (!hasAll) {
        return res.status(403).json({ error: "Access denied: insufficient granular permissions" });
      }

      next();
    } catch (err) {
      console.error("authorizePermissions error:", err);
      res.status(500).json({ error: "Authorization error" });
    }
  };
}

module.exports = { authorizeRoles, authorizePermissions };
