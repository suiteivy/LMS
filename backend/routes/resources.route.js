const express = require("express");
const { createResource, getResources, deleteResource, getPendingResources, approveResource } = require("../controllers/resources.controller.js");

const { authMiddleware } = require("../middleware/auth.middleware.js");
const { authorizeRoles } = require("../middleware/authRole.js");

const router = express.Router();

router.use(authMiddleware);

router.post("/", createResource);
router.get("/", getResources);
router.get("/pending", getPendingResources);
router.patch("/:id/approve", authorizeRoles(["admin"]), approveResource);
router.delete("/:id", deleteResource);

module.exports = router;
