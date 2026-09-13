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
    getFinanceAdminsList,
    toggleFinanceAdminDesignation,
    getFinanceAdminAuditLogs,
    getIndividualFinancialRecord,
    adjustIndividualBalance,
} = require("../controllers/finance.controller.js");

const FINANCE_DASHBOARD_ROLES = ['admin', 'school_admin', 'platform_admin', 'bursary', 'master_admin', 'finance_administrator', 'finance_admin'];
const FINANCE_OPERATIONAL_ROLES = ['admin', 'bursary', 'master_admin', 'finance_administrator', 'finance_admin'];

// Finance Administrator Designation Management (Main Admin / Master Admin only)
router.get("/administrators", authMiddleware, authorizeRoles(['admin', 'master_admin', 'platform_admin']), getFinanceAdminsList);
router.post("/administrators/toggle", authMiddleware, authorizeRoles(['admin', 'master_admin', 'platform_admin']), toggleFinanceAdminDesignation);
router.get("/administrators/audit", authMiddleware, authorizeRoles(['admin', 'master_admin', 'platform_admin']), getFinanceAdminAuditLogs);

// Individual Financial Records (Selectable-Person View)
router.get("/individual-records/:personType/:personId", authMiddleware, authorizeRoles(FINANCE_DASHBOARD_ROLES), getIndividualFinancialRecord);
router.post("/individual-records/adjust", authMiddleware, authorizeRoles(FINANCE_DASHBOARD_ROLES), adjustIndividualBalance);

// Funds
router.get("/funds", authMiddleware, authorizeRoles(FINANCE_OPERATIONAL_ROLES), getFunds);
router.post("/funds", authMiddleware, authorizeRoles(FINANCE_OPERATIONAL_ROLES), createFund);

// Allocations
router.get("/allocations/:fund_id", authMiddleware, authorizeRoles(FINANCE_OPERATIONAL_ROLES), getAllocations);
router.post("/allocations", authMiddleware, authorizeRoles(FINANCE_OPERATIONAL_ROLES), createAllocation);

// Transactions
router.get("/transactions", authMiddleware, getTransactions);
router.get('/payments', authMiddleware, authorizeRoles(FINANCE_DASHBOARD_ROLES), getPayments);
router.get('/revenue/overview', authMiddleware, authorizeRoles(FINANCE_DASHBOARD_ROLES), getRevenueOverview);
router.get('/revenue/deductions', authMiddleware, authorizeRoles(FINANCE_DASHBOARD_ROLES), getRevenueDeductions);
router.post('/revenue/deductions', authMiddleware, authorizeRoles(FINANCE_DASHBOARD_ROLES), createRevenueDeduction);
router.post("/transactions", authMiddleware, authorizeRoles(FINANCE_OPERATIONAL_ROLES), createTransaction);
router.put("/transactions/:id/process", authMiddleware, authorizeRoles(FINANCE_OPERATIONAL_ROLES), processTransaction);

// Fee Structures
router.get("/fee-structures", authMiddleware, getFeeStructures);
router.post("/fee-structures", authMiddleware, authorizeRoles(FINANCE_DASHBOARD_ROLES), createFeeStructure);
router.put("/fee-structures/:id", authMiddleware, authorizeRoles(FINANCE_DASHBOARD_ROLES), updateFeeStructure);
router.put("/fee-structures/:id/release", authMiddleware, authorizeRoles(FINANCE_DASHBOARD_ROLES), releaseFeeStructure);
router.put("/fee-structures/:id/revert-release", authMiddleware, authorizeRoles(FINANCE_DASHBOARD_ROLES), revertReleaseFeeStructure);
router.delete("/fee-structures/:id", authMiddleware, authorizeRoles(FINANCE_DASHBOARD_ROLES), deleteFeeStructure);

// Helper for Fees
router.post("/fees/pay", authMiddleware, authorizeRoles(FINANCE_OPERATIONAL_ROLES), recordFeePayment);
router.post("/fees/evidence", authMiddleware, submitPaymentEvidence); // Parents can submit
router.get("/fees/pending", authMiddleware, authorizeRoles(FINANCE_OPERATIONAL_ROLES), getPendingPayments);
router.post("/fees/confirm", authMiddleware, authorizeRoles(FINANCE_OPERATIONAL_ROLES), confirmPaymentEvidence);
router.get('/fees/:id/receipt', authMiddleware, authorizeRoles(FINANCE_DASHBOARD_ROLES), getPaymentReceipt);
router.get('/transactions/:id/receipt', authMiddleware, authorizeRoles(FINANCE_DASHBOARD_ROLES), getTransactionReceipt);

module.exports = router;
