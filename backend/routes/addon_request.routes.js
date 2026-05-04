const express = require("express");
const router = express.Router();
const controller = require("../controllers/addon_request.controller");
const { authMiddleware } = require("../middleware/auth.middleware"); // Populates req.userId and req.institution_id
const { requirePlatformAdmin } = require("../middleware/roleCheck");

// Combined routing for GET / (auth is handled in server.js)
router.get("/", (req, res) => {
    if (req.userRole === 'master_admin' || req.isPlatformAdmin) {
        return controller.getAllRequests(req, res);
    } else {
        return controller.getInstitutionRequests(req, res);
    }
});

// Institution Admin routes
router.post("/submit", authMiddleware, controller.createRequest);
router.get("/my-requests", authMiddleware, controller.getInstitutionRequests);

// Master Admin routes (Protected)
router.get("/all", authMiddleware, requirePlatformAdmin, controller.getAllRequests);
router.put("/:id/status", authMiddleware, requirePlatformAdmin, controller.updateRequestStatus);

module.exports = router;
