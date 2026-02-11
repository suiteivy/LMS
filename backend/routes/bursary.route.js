const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth.middleware");
const { authorizeRoles } = require("../middleware/authRole");
const {
  listBursaries,
  createBursary,
  getBursaryDetails,
  applyForBursary,
  updateApplicationStatus
} = require("../controllers/bursary.controller");

// Bursary Management
router.get("/", authMiddleware, listBursaries);
router.post("/", authMiddleware, authorizeRoles(['admin']), createBursary);
router.get("/:id", authMiddleware, getBursaryDetails);

// Applications
router.post("/apply", authMiddleware, authorizeRoles(['student']), applyForBursary);
router.put("/applications/:id", authMiddleware, authorizeRoles(['admin']), updateApplicationStatus);

module.exports = router;
