const express = require("express");
const router = express.Router();
const controller = require("../controllers/addon_request.controller");
const { authMiddleware } = require("../middleware/auth.middleware"); // Populates req.userId and req.institution_id

// Institution Admin routes
router.post("/submit", authMiddleware, controller.createRequest);
router.get("/my-requests", authMiddleware, controller.getInstitutionRequests);

// Master Admin routes
router.get("/all", authMiddleware, controller.getAllRequests);
router.put("/:id/status", authMiddleware, controller.updateRequestStatus);

module.exports = router;
