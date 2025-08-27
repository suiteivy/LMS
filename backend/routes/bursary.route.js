const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth.middleware");

// backend/routes/bursary.routes.js
const {
  recordFeePayment,
  getStudentFeeStatus,
  getTeacherEarnings,
  recordTeacherPayment,
} = require("../controllers/bursary.controller");

// Record payment
router.post("/fees/payment/:studentId", authMiddleware, recordFeePayment);

// Get student's fee status & balance
router.get("/fees/:studentId", authMiddleware, getStudentFeeStatus);

// Get teacher's earnings
router.get("/teacher/earnings/:teacherId", authMiddleware, getTeacherEarnings);

// Record teacher payment (admin only - add auth middleware if needed)
router.post("/teacher/pay", authMiddleware, recordTeacherPayment);

module.exports = router;
