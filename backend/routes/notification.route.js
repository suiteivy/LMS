const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth.middleware.js");
const { getUserNotifications, markAsRead, markAllAsRead } = require("../controllers/notification.controller.js");

router.get("/", authMiddleware, getUserNotifications);
router.put("/:id/read", authMiddleware, markAsRead);
router.put("/read-all", authMiddleware, markAllAsRead);

module.exports = router;
