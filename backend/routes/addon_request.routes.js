const express = require("express");
const router = express.Router();
const controller = require("../controllers/addon_request.controller");
const { authMiddleware } = require("../middleware/auth.middleware"); // Populates req.userId and req.institution_id
const { requirePlatformAdmin } = require("../middleware/roleCheck");
const { authorizeRoles } = require("../middleware/authRole");

// All routes require authentication
router.use(authMiddleware);

// Combined routing for GET /
router.get("/", authorizeRoles(['admin', 'master_admin']), (req, res) => {
    if (req.userRole === 'master_admin' || req.isPlatformAdmin) {
        return controller.getAllRequests(req, res);
    } else {
        return controller.getInstitutionRequests(req, res);
    }
});

// Institution Admin routes
router.post("/submit", authorizeRoles(['admin', 'master_admin']), controller.createRequest);
router.get("/my-requests", authorizeRoles(['admin', 'master_admin']), controller.getInstitutionRequests);

// Master Admin routes (Protected)
router.get("/all", requirePlatformAdmin, controller.getAllRequests);
router.put("/:id/status", requirePlatformAdmin, controller.updateRequestStatus);

module.exports = router;
