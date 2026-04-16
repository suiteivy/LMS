const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth.middleware.js");
const { getUserNotifications, markAsRead, markAllAsRead, deleteNotification, clearAllNotifications } = require("../controllers/notification.controller.js");

router.get("/", authMiddleware, getUserNotifications);
router.put("/:id/read", authMiddleware, markAsRead);
router.put("/read-all", authMiddleware, markAllAsRead);
router.delete("/:id", authMiddleware, deleteNotification);
router.delete("/", authMiddleware, clearAllNotifications);

module.exports = router;
