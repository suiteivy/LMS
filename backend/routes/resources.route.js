const express = require("express");
const { createResource, getResources, deleteResource, downloadResource } = require("../controllers/resources.controller.js");

const { authMiddleware } = require("../middleware/auth.middleware.js");
const { authorizeRoles } = require("../middleware/authRole.js");

const router = express.Router();

router.use(authMiddleware);

router.post("/", authorizeRoles(["admin", "teacher", "master_admin"]), createResource);
router.get("/", authorizeRoles(["admin", "teacher", "student", "parent", "master_admin"]), getResources);
router.get("/:id/download", authorizeRoles(["admin", "teacher", "student", "parent", "master_admin"]), downloadResource);
router.delete("/:id", authorizeRoles(["admin", "teacher", "master_admin"]), deleteResource);

module.exports = router;
