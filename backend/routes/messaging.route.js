const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth.middleware");
const { sendMessage, getMessages, markAsRead } = require("../controllers/messaging.controller");

router.post("/send", authMiddleware, sendMessage);
router.get("/", authMiddleware, getMessages);
router.put("/:id/read", authMiddleware, markAsRead);

module.exports = router;
