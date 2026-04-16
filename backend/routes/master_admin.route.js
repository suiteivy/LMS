const express = require("express");
const router = express.Router();

const masterAdminController = require("../controllers/master_admin.controller.js");

const { requirePlatformAdmin } = require("../middleware/roleCheck.js");

// All routes require the user to be a Master Platform Admin
router.use(requirePlatformAdmin);

// Dashboard Statistics
router.get("/stats", masterAdminController.getDashboardStats);

// Institutions Management
router.get("/institutions", masterAdminController.getAllInstitutions);
router.get("/institutions/:id", masterAdminController.getInstitutionDetails);
router.put("/institutions/:id", masterAdminController.updateInstitutionDetails); // General update (metadata + subscription)

router.post('/institutions', masterAdminController.enrollInstitution);
router.put("/institutions/:id/subscription", masterAdminController.updateSubscriptionStatus);
router.delete("/institutions/:id", masterAdminController.deleteInstitution);

// Global Users View (all institutions)
router.get("/users", masterAdminController.getAllUsers);

// Communications / App Updates
router.post("/notifications", masterAdminController.notifyTarget);

// Platform Payments
router.post("/payments", masterAdminController.recordPlatformPayment); // Manual payment recording
router.get("/payments", masterAdminController.getAllPayments); // Global ledger

// Master Platform Admin profile editor
router.put('/profile', masterAdminController.updatePlatformProfile);

// Enroll new Master Admin
router.post('/enroll-master-admin', masterAdminController.enrollMasterAdmin);

// View and update support requests
router.get('/support-requests', masterAdminController.getSupportRequests);
router.put('/support-requests/:id', masterAdminController.updateSupportRequest);
router.get('/support-requests/:id/messages', masterAdminController.getTicketMessages);
router.post('/support-requests/:id/messages', masterAdminController.addTicketMessage);

// Global Payments Ledger
router.get("/payments", masterAdminController.getAllPayments);

// Institution Analytics
router.get("/analytics/:id", masterAdminController.getInstitutionAnalytics);

// School Category Management
router.get("/school-categories", masterAdminController.getSchoolCategories);
router.post("/school-categories", masterAdminController.upsertSchoolCategory);
router.delete("/school-categories/:id", masterAdminController.deleteSchoolCategory);

module.exports = router;
