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
    confirmPaymentEvidence
} = require("../controllers/finance.controller.js");

// Funds
router.get("/funds", authMiddleware, authorizeRoles(['admin', 'bursary', 'master_admin']), getFunds);
router.post("/funds", authMiddleware, authorizeRoles(['admin', 'bursary', 'master_admin']), createFund);

// Allocations
router.get("/allocations/:fund_id", authMiddleware, authorizeRoles(['admin', 'bursary', 'master_admin']), getAllocations);
router.post("/allocations", authMiddleware, authorizeRoles(['admin', 'bursary', 'master_admin']), createAllocation);

// Transactions (Unified Replacement for Payments/Payouts)
router.get("/transactions", authMiddleware, getTransactions);
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

module.exports = router;
