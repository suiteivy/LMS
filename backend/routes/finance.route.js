const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth.middleware.js");
const { authorizeRoles } = require("../middleware/authRole.js");
const {
    createFund,
    getFunds,
    createAllocation,
    getAllocations,
    getTransactions,
    getRevenueOverview,
    getRevenueDeductions,
    createRevenueDeduction,
    getPayments,
    createTransaction,
    processTransaction,
    getFeeStructures,
    createFeeStructure,
    updateFeeStructure,
    releaseFeeStructure,
    revertReleaseFeeStructure,
    deleteFeeStructure,
    recordFeePayment,
    submitPaymentEvidence,
    getPendingPayments,
    confirmPaymentEvidence,
    getPaymentReceipt,
    getTransactionReceipt,
} = require("../controllers/finance.controller.js");

// Funds
router.get("/funds", authMiddleware, authorizeRoles(['admin', 'bursary', 'master_admin']), getFunds);
router.post("/funds", authMiddleware, authorizeRoles(['admin', 'bursary', 'master_admin']), createFund);

// Allocations
router.get("/allocations/:fund_id", authMiddleware, authorizeRoles(['admin', 'bursary', 'master_admin']), getAllocations);
router.post("/allocations", authMiddleware, authorizeRoles(['admin', 'bursary', 'master_admin']), createAllocation);

// Transactions
router.get("/transactions", authMiddleware, getTransactions);
router.get('/payments', authMiddleware, authorizeRoles(['admin', 'school_admin', 'platform_admin', 'bursary', 'master_admin']), getPayments);
router.get('/revenue/overview', authMiddleware, authorizeRoles(['admin', 'school_admin', 'platform_admin', 'bursary', 'master_admin']), getRevenueOverview);
router.get('/revenue/deductions', authMiddleware, authorizeRoles(['admin', 'school_admin', 'platform_admin', 'bursary', 'master_admin']), getRevenueDeductions);
router.post('/revenue/deductions', authMiddleware, authorizeRoles(['admin', 'school_admin', 'platform_admin', 'bursary', 'master_admin']), createRevenueDeduction);
router.post("/transactions", authMiddleware, authorizeRoles(['admin', 'bursary', 'master_admin']), createTransaction);
router.put("/transactions/:id/process", authMiddleware, authorizeRoles(['admin', 'bursary', 'master_admin']), processTransaction);

// Fee Structures
router.get("/fee-structures", authMiddleware, getFeeStructures);
router.post("/fee-structures", authMiddleware, authorizeRoles(['admin', 'school_admin', 'platform_admin', 'bursary', 'master_admin']), createFeeStructure);
router.put("/fee-structures/:id", authMiddleware, authorizeRoles(['admin', 'school_admin', 'platform_admin', 'bursary', 'master_admin']), updateFeeStructure);
router.put("/fee-structures/:id/release", authMiddleware, authorizeRoles(['admin', 'school_admin', 'platform_admin', 'bursary', 'master_admin']), releaseFeeStructure);
router.put("/fee-structures/:id/revert-release", authMiddleware, authorizeRoles(['admin', 'school_admin', 'platform_admin', 'bursary', 'master_admin']), revertReleaseFeeStructure);
router.delete("/fee-structures/:id", authMiddleware, authorizeRoles(['admin', 'school_admin', 'platform_admin', 'bursary', 'master_admin']), deleteFeeStructure);

// Helper for Fees
router.post("/fees/pay", authMiddleware, authorizeRoles(['admin', 'bursary', 'master_admin']), recordFeePayment);
router.post("/fees/evidence", authMiddleware, submitPaymentEvidence); // Parents can submit
router.get("/fees/pending", authMiddleware, authorizeRoles(['admin', 'bursary', 'master_admin']), getPendingPayments);
router.post("/fees/confirm", authMiddleware, authorizeRoles(['admin', 'bursary', 'master_admin']), confirmPaymentEvidence);
router.get('/fees/:id/receipt', authMiddleware, authorizeRoles(['admin', 'school_admin', 'platform_admin', 'bursary', 'master_admin']), getPaymentReceipt);
router.get('/transactions/:id/receipt', authMiddleware, authorizeRoles(['admin', 'school_admin', 'platform_admin', 'bursary', 'master_admin']), getTransactionReceipt);

module.exports = router;
