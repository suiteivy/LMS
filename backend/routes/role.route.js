const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth.middleware.js");
const { authorizeRoles } = require("../middleware/authRole.js");

const {
  getRoles,
  getPermissions,
  createRole,
  updateRole,
  deleteRole,
  assignUserRoles,
  getUserRoles
} = require("../controllers/role.controller.js");

router.use(authMiddleware);

// Only administrators can manage custom roles and user role assignments
router.get("/", authorizeRoles(["admin", "master_admin"]), getRoles);
router.get("/permissions", authorizeRoles(["admin", "master_admin"]), getPermissions);
router.post("/", authorizeRoles(["admin", "master_admin"]), createRole);
router.put("/:id", authorizeRoles(["admin", "master_admin"]), updateRole);
router.delete("/:id", authorizeRoles(["admin", "master_admin"]), deleteRole);

router.post("/assign", authorizeRoles(["admin", "master_admin"]), assignUserRoles);
router.get("/user/:userId", authorizeRoles(["admin", "master_admin"]), getUserRoles);

module.exports = router;
