// backend/middleware/authRole.js
/**
 * Middleware to check if the authenticated user has one of the allowed roles.
 * Works with CommonJS `require` and expects `req.user.role` set by auth.middleware.
 *
 * @param {string[]} roles - array of allowed role names, e.g. ['admin', 'teacher']
 * @returns {(req, res, next) => void}
 */
function normalizeRoleName(role) {
  const value = String(role || '').trim().toLowerCase();
  if (!value) return null;

  if (value === 'bursar') return 'bursary';
  if (value === 'school_admin') return 'admin';
  if (value === 'platform_admin') return 'master_admin';

  return value;
}

function expandRoleAliases(role) {
  const normalized = normalizeRoleName(role);
  if (!normalized) return [];

  const expanded = new Set([normalized]);

  if (normalized === 'admin') expanded.add('school_admin');
  if (normalized === 'master_admin') expanded.add('platform_admin');
  if (normalized === 'bursary') expanded.add('bursar');

  return Array.from(expanded);
}

function authorizeRoles(roles = []) {
  return (req, res, next) => {
    try {
      const user = req.user; // comes from auth middleware (must run before this)

      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const allowedRoles = new Set();
      roles.forEach((role) => {
        expandRoleAliases(role).forEach((alias) => allowedRoles.add(alias));
      });

      const userRoles = new Set();
      const addUserRole = (role) => {
        expandRoleAliases(role).forEach((alias) => userRoles.add(alias));
      };

      addUserRole(user.active_role);
      addUserRole(user.role);

      let isAllowed = Array.from(userRoles).some((role) => allowedRoles.has(role));

      // Check available roles (e.g. admin who is also teacher)
      if (!isAllowed && Array.isArray(user.available_roles) && user.available_roles.length > 0) {
        user.available_roles.forEach(addUserRole);
        isAllowed = Array.from(userRoles).some((role) => allowedRoles.has(role));
      }

      // Check custom roles as well
      if (!isAllowed && user.roles && user.roles.length > 0) {
        user.roles.forEach(addUserRole);
        isAllowed = Array.from(userRoles).some((role) => allowedRoles.has(role));
      }

      // Master admins (including platform_admin alias) inherit standard admin route privileges
      if (!isAllowed && userRoles.has('master_admin') && allowedRoles.has('admin')) {
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

/**
 * Middleware to check if user has the active Librarian designation
 * or is Main Admin / Master Admin.
 */
function authorizeLibrarian() {
  return (req, res, next) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Master admin always has access
      if (user.role === 'master_admin' || user.is_platform_admin) {
        return next();
      }

      // Main Admin of the institution has access
      if (user.role === 'admin' && user.is_main) {
        return next();
      }

      // User with active librarian designation
      if (user.is_librarian || req.isLibrarian) {
        return next();
      }

      return res.status(403).json({
        error: "Access denied: Librarian designation required.",
        code: "LIBRARIAN_REQUIRED"
      });
    } catch (err) {
      console.error("authorizeLibrarian error:", err);
      res.status(500).json({ error: "Authorization error" });
    }
  };
}

/**
 * Middleware to check if user is the Main Admin or Master Admin.
 */
function authorizeMainAdmin() {
  return (req, res, next) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      if (user.role === 'master_admin' || user.is_platform_admin) {
        return next();
      }

      if (user.role === 'admin' && user.is_main) {
        return next();
      }

      return res.status(403).json({
        error: "Access denied: Main Admin privilege required.",
        code: "MAIN_ADMIN_REQUIRED"
      });
    } catch (err) {
      console.error("authorizeMainAdmin error:", err);
      res.status(500).json({ error: "Authorization error" });
    }
  };
}

module.exports = { authorizeRoles, authorizePermissions, authorizeLibrarian, authorizeMainAdmin };

