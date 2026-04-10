const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth.middleware.js");
const { authorizeRoles } = require("../middleware/authRole.js");
const {
  listBursaries,
  createBursary,
  getBursaryDetails,
  applyForBursary,
  updateApplicationStatus,
  approveBursaryForStudent,
  getMyApprovedBursaries
} = require("../controllers/bursary.controller.js");

// Bursary Management
router.get("/", authMiddleware, listBursaries);
router.post("/", authMiddleware, authorizeRoles(['admin', 'bursary']), createBursary);
router.get("/:id", authMiddleware, getBursaryDetails);

// Applications
router.post("/apply", authMiddleware, authorizeRoles(['student']), applyForBursary);
router.put("/applications/:id", authMiddleware, authorizeRoles(['admin', 'bursary']), updateApplicationStatus);

// Admin direct approval for a student
router.post("/approve-student", authMiddleware, authorizeRoles(['admin', 'bursary']), approveBursaryForStudent);

// Student: get my approved bursaries
router.get("/my/approved", authMiddleware, authorizeRoles(['student']), getMyApprovedBursaries);

module.exports = router;

