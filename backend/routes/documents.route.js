// backend/routes/documents.route.js
const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth.middleware.js");
const { authorizeRoles } = require("../middleware/authRole.js");
const {
  uploadAndPublishDocument,
  getDeliveredDocuments,
  recordDocumentInteraction,
  getDocumentTracking,
  withdrawDocument,
  remindUnopenedRecipients
} = require("../controllers/documents.controller.js");

const DOCUMENT_ADMIN_ROLES = ['admin', 'school_admin', 'platform_admin', 'master_admin'];

// Recipient endpoints (Parent, Student, Staff)
router.get("/delivered", authMiddleware, getDeliveredDocuments);
router.post("/:documentId/interaction", authMiddleware, recordDocumentInteraction);

// Admin Publisher & Tracking endpoints
router.post("/publish", authMiddleware, authorizeRoles(DOCUMENT_ADMIN_ROLES), uploadAndPublishDocument);
router.get("/:documentId/tracking", authMiddleware, authorizeRoles(DOCUMENT_ADMIN_ROLES), getDocumentTracking);
router.post("/:documentId/withdraw", authMiddleware, authorizeRoles(DOCUMENT_ADMIN_ROLES), withdrawDocument);
router.post("/:documentId/remind", authMiddleware, authorizeRoles(DOCUMENT_ADMIN_ROLES), remindUnopenedRecipients);

module.exports = router;
