const express = require('express');
const {
  recordFeePayment,
  getStudentFeeStatus,
  getTeacherEarnings,
  recordTeacherPayment,
} = require('../controllers/bursary.controller');

const { authMiddleware } = require('../middleware/auth.middleware');
const { authorizeRoles } = require('../middleware/authRole');

const router = express.Router();

// Student fee payment
router.post(
  '/fees/payment',
  authMiddleware,
  authorizeRoles(['student']),
  recordFeePayment
);

// Student fee status
router.get(
  '/fees/:studentId',
  authMiddleware,
  authorizeRoles(['student', 'admin']),
  getStudentFeeStatus
);

// Teacher earnings
router.get(
  '/teacher/earnings/:teacherId',
  authMiddleware,
  authorizeRoles(['teacher']),
  getTeacherEarnings
);

// Record teacher payment (admin only)
router.post(
  '/teacher/pay',
  authMiddleware,
  authorizeRoles(['admin']),
  recordTeacherPayment
);

module.exports = router;
