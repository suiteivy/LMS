const express = require("express");
const router = express.Router();
const controller = require("../controllers/diary.controller");
const { authMiddleware } = require("../middleware/auth.middleware");
const checkSubscription = require("../middleware/subscriptionCheck");

const { authorizeRoles } = require("../middleware/authRole");

router.use(authMiddleware);
router.use(checkSubscription);

// Create: Admin or Teacher
router.post("/", authorizeRoles(["admin", "teacher"]), controller.createEntry);

// Read: All authenticated internal roles
router.get("/", authorizeRoles(["admin", "teacher", "student", "parent"]), controller.getEntries);

// Update/Delete: Admin or Teacher
router.put("/:id", authorizeRoles(["admin", "teacher"]), controller.updateEntry);
router.delete("/:id", authorizeRoles(["admin", "teacher"]), controller.deleteEntry);

module.exports = router;
