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

      let isAllowed = roles.includes(user.role);

      // Master Admins inherit standard 'admin' route privileges 
      if (!isAllowed && user.role === 'master_admin' && roles.includes('admin')) {
        isAllowed = true;
      }

      if (!user || !isAllowed) {
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

module.exports = { authorizeRoles };
