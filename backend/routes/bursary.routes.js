// backend/routes/bursary.routes.js
import express from 'express';
import {
  recordFeePayment,
  getStudentFeeStatus,
  getTeacherEarnings,
  recordTeacherPayment,
} from '../controllers/bursary.controller.js';

const router = express.Router();

// Record payment
router.post('/fees/payment', recordFeePayment);

// Get student's fee status & balance
router.get('/fees/:studentId', getStudentFeeStatus);

// Get teacher's earnings
router.get('/teacher/earnings/:teacherId', getTeacherEarnings);

// Record teacher payment (admin only - add auth middleware if needed)
router.post('/teacher/pay', recordTeacherPayment);

export default router;
