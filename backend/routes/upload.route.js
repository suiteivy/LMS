const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth.middleware.js");
const { authorizeRoles } = require("../middleware/authRole.js");
const { handleUpload } = require("../controllers/upload.controller.js");

router.use(authMiddleware);

// Upload endpoint for admin, teacher, student
router.post("/", authorizeRoles(["admin", "teacher", "student", "master_admin"]), handleUpload);

module.exports = router;
