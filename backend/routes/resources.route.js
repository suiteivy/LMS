const express = require("express");
const { createResource, getResources, deleteResource } = require("../controllers/resources.controller");
const { authMiddleware } = require("../middleware/auth.middleware");

const router = express.Router();

router.post("/", authMiddleware, createResource);
router.get("/", authMiddleware, getResources);
router.delete("/:id", authMiddleware, deleteResource);

module.exports = router;
