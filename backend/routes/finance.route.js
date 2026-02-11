const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth.middleware");
const { authorizeRoles } = require("../middleware/authRole");
const {
    getStudentFees,
    recordPayment,
    listAllPayments,
    getTeacherPayouts,
    listAllPayouts,
    processPayout,
    getFeeStructures,
    updateFeeStructure
} = require("../controllers/finance.controller");

// Student Fees
router.get("/fees/:studentId", authMiddleware, getStudentFees);
router.get("/payments/all", authMiddleware, authorizeRoles(['admin']), listAllPayments);
router.post("/payments", authMiddleware, authorizeRoles(['admin']), recordPayment);

// Teacher Payouts
router.get("/payouts/:teacherId", authMiddleware, getTeacherPayouts);
router.get("/payouts/all", authMiddleware, authorizeRoles(['admin']), listAllPayouts);
router.put("/payouts/:payoutId/process", authMiddleware, authorizeRoles(['admin']), processPayout);

// Fee Structures
router.get("/fee-structures", authMiddleware, getFeeStructures);
router.post("/fee-structures", authMiddleware, authorizeRoles(['admin']), updateFeeStructure);

module.exports = router;
