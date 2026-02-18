const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth.middleware");
const { authorizeRoles } = require("../middleware/authRole");
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
    recordFeePayment
} = require("../controllers/finance.controller");

// Funds
router.get("/funds", authMiddleware, getFunds);
router.post("/funds", authMiddleware, authorizeRoles(['admin', 'bursary']), createFund);

// Allocations
router.get("/allocations", authMiddleware, getAllocations);
router.post("/allocations", authMiddleware, authorizeRoles(['admin', 'bursary']), createAllocation);

// Transactions (Unified Replacement for Payments/Payouts)
router.get("/transactions", authMiddleware, getTransactions);
router.post("/transactions", authMiddleware, authorizeRoles(['admin', 'bursary']), createTransaction);
router.put("/transactions/:id/process", authMiddleware, authorizeRoles(['admin', 'bursary']), processTransaction);

// Fee Structures
router.get("/fee-structures", authMiddleware, getFeeStructures);
router.post("/fee-structures", authMiddleware, authorizeRoles(['admin', 'bursary']), require("../controllers/finance.controller").createFeeStructure);
router.put("/fee-structures/:id", authMiddleware, authorizeRoles(['admin', 'bursary']), updateFeeStructure);

// Helper for Fees
router.post("/fees/pay", authMiddleware, authorizeRoles(['admin', 'bursary']), recordFeePayment);

module.exports = router;
