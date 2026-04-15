const express = require("express");
const { createResource, getResources, deleteResource, getPendingResources, approveResource } = require("../controllers/resources.controller.js");
const { authMiddleware } = require("../middleware/auth.middleware.js");

const router = express.Router();

router.post("/", authMiddleware, createResource);
router.get("/", authMiddleware, getResources);
router.get("/pending", authMiddleware, getPendingResources);
router.put("/:id/approve", authMiddleware, approveResource);
router.delete("/:id", authMiddleware, deleteResource);

module.exports = router;
