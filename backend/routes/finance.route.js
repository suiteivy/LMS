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
    updateFeeStructure,
    recordFeePayment,
    submitPaymentEvidence,
    getPendingPayments,
    confirmPaymentEvidence
} = require("../controllers/finance.controller.js");

// Funds
router.get("/funds", authMiddleware, getFunds);
router.post("/funds", authMiddleware, authorizeRoles(['admin', 'bursary', 'master_admin']), createFund);

// Allocations
router.get("/allocations", authMiddleware, getAllocations);
router.post("/allocations", authMiddleware, authorizeRoles(['admin', 'bursary', 'master_admin']), createAllocation);

// Transactions (Unified Replacement for Payments/Payouts)
router.get("/transactions", authMiddleware, getTransactions);
router.post("/transactions", authMiddleware, authorizeRoles(['admin', 'bursary', 'master_admin']), createTransaction);
router.put("/transactions/:id/process", authMiddleware, authorizeRoles(['admin', 'bursary', 'master_admin']), processTransaction);

// Fee Structures
router.get("/fee-structures", authMiddleware, getFeeStructures);
router.post("/fee-structures", authMiddleware, authorizeRoles(['admin', 'bursary', 'master_admin']), require("../controllers/finance.controller.js").createFeeStructure);
router.put("/fee-structures/:id", authMiddleware, authorizeRoles(['admin', 'bursary', 'master_admin']), updateFeeStructure);

// Helper for Fees
router.post("/fees/pay", authMiddleware, authorizeRoles(['admin', 'bursary', 'master_admin']), recordFeePayment);
router.post("/fees/evidence", authMiddleware, submitPaymentEvidence); // Parents can submit
router.get("/fees/pending", authMiddleware, authorizeRoles(['admin', 'bursary', 'master_admin']), getPendingPayments);
router.post("/fees/confirm", authMiddleware, authorizeRoles(['admin', 'bursary', 'master_admin']), confirmPaymentEvidence);

module.exports = router;
