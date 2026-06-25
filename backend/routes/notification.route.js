const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth.middleware.js");
const {
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
  getDeliveryAttempts,
  runNotificationRetryNow,
} = require("../controllers/notification.controller.js");
const { authorizeRoles } = require("../middleware/authRole.js");

router.get("/", authMiddleware, getUserNotifications);
router.put("/read-all", authMiddleware, markAllAsRead);
router.put("/:id/read", authMiddleware, markAsRead);
router.delete("/:id", authMiddleware, deleteNotification);
router.delete("/", authMiddleware, clearAllNotifications);

router.get('/delivery-attempts', authMiddleware, authorizeRoles(['admin', 'master_admin']), getDeliveryAttempts);
router.post('/retry-now', authMiddleware, authorizeRoles(['admin', 'master_admin']), runNotificationRetryNow);

module.exports = router;
