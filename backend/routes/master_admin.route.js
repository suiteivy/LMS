const express = require("express");
const router = express.Router();

const masterAdminController = require("../controllers/master_admin.controller");

const { requirePlatformAdmin } = require("../middleware/roleCheck");

// All routes require the user to be a Master Platform Admin
router.use(requirePlatformAdmin);

// Dashboard Statistics
router.get("/stats", masterAdminController.getDashboardStats);

// Institutions Management
router.get("/institutions", masterAdminController.getAllInstitutions);
router.get("/institutions/:id", masterAdminController.getInstitutionDetails);
router.put("/institutions/:id/subscription", masterAdminController.updateSubscriptionStatus);

// Set up a new institution from scratch
router.post('/institutions', masterAdminController.enrollInstitution);

// Communications / App Updates
router.post("/notifications", masterAdminController.notifyTarget);

// Master Platform Admin profile editor
router.put('/profile', masterAdminController.updatePlatformProfile);

// Enroll new Master Admin
router.post('/enroll-master-admin', masterAdminController.enrollMasterAdmin);

// View and update support requests
router.get('/support-requests', masterAdminController.getSupportRequests);
router.put('/support-requests/:id', masterAdminController.updateSupportRequest);

module.exports = router;
