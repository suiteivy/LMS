// backend/middleware/authRole.js

/**
 * Middleware to check if the authenticated user has one of the allowed roles
 * @param {Array} roles - array of allowed role names
 */
export const authorizeRoles = (roles = []) => {
  return (req, res, next) => {
    try {
      const user = req.user; // comes from auth middleware (must run before this)

      if (!user || !roles.includes(user.role)) {
        return res.status(403).json({ error: 'Access denied: insufficient permissions' });
      }

      next();
    } catch (err) {
      res.status(500).json({ error: 'Authorization error' });
    }
  };
};
