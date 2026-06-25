const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth.middleware.js");
const {
  sendMessage,
  getMessages,
  markAsRead,
  startConversation,
  listConversations,
  listConversationMessages,
  sendConversationMessage,
  editMessage,
  deleteMessageForMe,
  deleteMessageForEveryone,
  deleteConversationForMe,
  clearConversationForMe,
  markConversationRead,
  acknowledgeDelivery,
} = require("../controllers/messaging.controller.js");

// New direct messaging conversation endpoints
router.post("/conversations/start", authMiddleware, startConversation);
router.get("/conversations", authMiddleware, listConversations);
router.get("/conversations/:conversationId/messages", authMiddleware, listConversationMessages);
router.post("/conversations/:conversationId/messages", authMiddleware, sendConversationMessage);
router.put("/conversations/:conversationId/read", authMiddleware, markConversationRead);
router.put("/conversations/:conversationId/delivered", authMiddleware, acknowledgeDelivery);
router.delete("/conversations/:conversationId", authMiddleware, deleteConversationForMe);
router.post("/conversations/:conversationId/clear-for-me", authMiddleware, clearConversationForMe);

router.put("/message/:messageId", authMiddleware, editMessage);
router.post("/message/:messageId/delete-for-me", authMiddleware, deleteMessageForMe);
router.post("/message/:messageId/delete-for-everyone", authMiddleware, deleteMessageForEveryone);

router.post("/send", authMiddleware, sendMessage);
router.get("/", authMiddleware, getMessages);
router.put("/:id/read", authMiddleware, markAsRead);

module.exports = router;
