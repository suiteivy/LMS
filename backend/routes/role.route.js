const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth.middleware.js");
const { authorizeRoles } = require("../middleware/authRole.js");

const {
  getRoles,
  getPermissions,
  getTemplates,
  getFeatures,
  getHelpContent,
  getAuditLogs,
  getEffectivePermissions,
  createRole,
  updateRole,
  deleteRole,
  assignUserRoles,
  getUserRoles,
  setPermissionOverride,
  deletePermissionOverride
} = require("../controllers/role.controller.js");

router.use(authMiddleware);

// Feature registry, templates, guidance, permissions
router.get("/permissions", authorizeRoles(["admin", "master_admin"]), getPermissions);

// Feature registry, templates, guidance
router.get("/templates", authorizeRoles(["admin", "master_admin"]), getTemplates);
router.get("/features", authorizeRoles(["admin", "master_admin"]), getFeatures);
router.get("/help", getHelpContent);
router.get("/audit", authorizeRoles(["admin", "master_admin"]), getAuditLogs);
router.get("/effective/:userId", authorizeRoles(["admin", "master_admin"]), getEffectivePermissions);

// Overrides (explicit allow / deny)
router.post("/override", authorizeRoles(["admin", "master_admin"]), setPermissionOverride);
router.delete("/override/:overrideId", authorizeRoles(["admin", "master_admin"]), deletePermissionOverride);

// Roles CRUD
router.get("/", authorizeRoles(["admin", "master_admin"]), getRoles);
router.post("/", authorizeRoles(["admin", "master_admin"]), createRole);
router.put("/:id", authorizeRoles(["admin", "master_admin"]), updateRole);
router.delete("/:id", authorizeRoles(["admin", "master_admin"]), deleteRole);

// User role assignments
router.post("/assign", authorizeRoles(["admin", "master_admin"]), assignUserRoles);
router.get("/user/:userId", authorizeRoles(["admin", "master_admin"]), getUserRoles);

module.exports = router;
