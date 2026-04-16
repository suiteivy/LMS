const express = require("express");
const router = express.Router();
const controller = require("../controllers/diary.controller.js");
const { authMiddleware } = require("../middleware/auth.middleware.js");
const checkSubscription = require("../middleware/subscriptionCheck.js");

const { authorizeRoles } = require("../middleware/authRole.js");

router.use(authMiddleware);
router.use(checkSubscription);

// Create: Admin or Teacher
router.post("/", authorizeRoles(["admin", "teacher"]), controller.createEntry);

// Read: All authenticated internal roles
router.get("/", authorizeRoles(["admin", "teacher", "student", "parent"]), controller.getEntries);

// Update/Delete: Admin or Teacher
router.put("/:id", authorizeRoles(["admin", "teacher"]), controller.updateEntry);
router.delete("/:id", authorizeRoles(["admin", "teacher"]), controller.deleteEntry);

// Signing and Approval
router.patch("/:id/sign", authorizeRoles(["parent"]), controller.signEntry);
router.patch("/:id/approve", authorizeRoles(["admin"]), controller.approveEntry);

module.exports = router;
