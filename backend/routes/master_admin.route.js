const express = require("express");
const router = express.Router();

const masterAdminController = require("../controllers/master_admin.controller.js");

const { requirePlatformAdmin } = require("../middleware/roleCheck.js");

// All routes require the user to be a Master Platform Admin
router.use(requirePlatformAdmin);

// Dashboard Statistics
router.get("/stats", masterAdminController.getDashboardStats);
router.get('/logs/system-activity', masterAdminController.getSystemActivityLogs);
router.post('/logs/system-activity/clear', masterAdminController.clearSystemActivityLogs);
router.post('/subscriptions/lifecycle-sweep', masterAdminController.runSubscriptionLifecycleSweep);
router.get('/subscriptions/lifecycle-sweep/preview', masterAdminController.previewSubscriptionLifecycleSweep);
router.get('/maintenance-mode', masterAdminController.getMaintenanceMode);
router.put('/maintenance-mode', masterAdminController.updateMaintenanceMode);
router.get("/password-audit-logs", masterAdminController.getPasswordAuditLogs);
router.post('/password-audit-logs/clear', masterAdminController.clearPasswordAuditLogs);
router.get("/credential-delivery/:token", masterAdminController.getCredentialDeliveryByToken);

// Institutions Management
router.get("/institutions", masterAdminController.getAllInstitutions);
router.get("/institutions/:id", masterAdminController.getInstitutionDetails);
router.put("/institutions/:id", masterAdminController.updateInstitutionDetails);
router.put("/institutions/:id/subscription", masterAdminController.updateSubscriptionStatus);
router.delete("/institutions/admins/:userId", masterAdminController.removeInstitutionAdmin);

router.post('/institutions', masterAdminController.enrollInstitution);
router.delete("/institutions/:id", masterAdminController.deleteInstitution);

// Global Users View (all institutions)
router.get("/users", masterAdminController.getAllUsers);
router.put("/users/:id", masterAdminController.updateUser);
router.delete("/users/:id", masterAdminController.deleteMasterAdminUser);

// Communications / App Updates
router.post("/notifications", masterAdminController.notifyTarget);
router.get("/notifications/history", masterAdminController.getNoticeHistory);
router.put('/notifications/:noticeId', masterAdminController.updateNotice);
router.put('/notifications/:noticeId/extend-expiry', masterAdminController.extendNoticeExpiry);
router.delete('/notifications/:noticeId', masterAdminController.deleteNotice);

// Platform Payments
router.post("/payments", masterAdminController.recordPlatformPayment); // Manual payment recording
router.get("/payments", masterAdminController.getAllPayments); // Global ledger
router.put("/payments/:id", masterAdminController.updatePlatformPayment);
router.get("/payments/export", masterAdminController.exportPlatformPaymentsCsv);
router.get("/payments/summary", masterAdminController.getPaymentsSummaryByInstitution);
router.get('/payments/:id/receipt', masterAdminController.getPlatformPaymentReceipt);

// Master Platform Admin profile editor
router.put('/profile', masterAdminController.updatePlatformProfile);

// Enroll new Master Admin
router.post('/enroll-master-admin', masterAdminController.enrollMasterAdmin);

// View and update support requests
router.get('/support-requests', masterAdminController.getSupportRequests);
router.put('/support-requests/:id', masterAdminController.updateSupportRequest);
router.delete('/support-requests/:id', masterAdminController.deleteSupportRequest);
router.get('/support-requests/:id/messages', masterAdminController.getTicketMessages);
router.post('/support-requests/:id/messages', masterAdminController.addTicketMessage);

// Global Payments Ledger
// Redundant route removed (was duplicate of line 31)

// Institution Analytics
router.get("/analytics/:id", masterAdminController.getInstitutionAnalytics);

// School Category Management
router.get("/school-categories", masterAdminController.getSchoolCategories);
router.post("/school-categories", masterAdminController.upsertSchoolCategory);
router.delete("/school-categories/:id", masterAdminController.deleteSchoolCategory);

// Currency Management (Master Admin only)
router.get('/currencies', masterAdminController.getCurrencies);
router.post('/currencies', masterAdminController.upsertCurrency);
router.put('/currencies/:id', (req, _res, next) => {
  req.body = { ...(req.body || {}), id: req.params.id };
  next();
}, masterAdminController.upsertCurrency);
router.delete('/currencies/:id', masterAdminController.deactivateCurrency);

module.exports = router;
