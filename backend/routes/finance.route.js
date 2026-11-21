const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth.middleware.js");
const { authorizeRoles, authorizeFinanceAction } = require("../middleware/authRole.js");
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
    getFeeComponents,
    createFeeComponent,
    updateFeeComponent,
    deleteFeeComponent,
    getStudentDiscountsAndWaivers,
    createFeeDiscountOrWaiver,
    revokeFeeDiscountOrWaiver,
    generateStudentInvoice,
    voidStudentInvoice,
    getFamilyInvoice,
    getStudentInvoices,
    compileInvoicePdf,
    compileInvoicePdfBase64,
    compilePaymentReceiptPdf,
    compilePaymentReceiptBase64,
    sendOverdueFeeReminders,
    // Reconstructed Finance Methods
    getFeeCategories,
    createFeeCategory,
    getFeeTypes,
    createFeeType,
    updateFeeType,
    getPaymentsInbox,
    confirmPayment,
    flagPayment,
    bulkConfirmPayments,
    reversePayment,
    getFinanceSettings,
    updateFinanceSettings,
    createPaymentMethod,
    updatePaymentMethod,
    createFlagReason,
    updateFlagReason,
    getParentFinanceOverview,
    getChildPayableItems,
    recordParentPayment,
    getParentPaymentHistory,
    getOfficialReceiptPdf,
    getOfficialReceiptBase64,
    // Reconciled Fee Structures & Optional Items
    getFeeStructuresV2,
    getFeeStructureDetails,
    createFeeStructureV2,
    updateFeeStructureV2,
    copyFeeStructure,
    bulkPercentageIncrease,
    publishFeeStructure,
    getParentViewPreview,
    compileFeeStructurePdf,
    compileFeeStructureBase64,
    getOptionCatalogs,
    createOptionCatalog,
    updateOptionCatalog,
    deleteOptionCatalog,
    bulkImportCatalogs,
    getOptionalItemsQueue,
    confirmOptOut,
    markTakingItem,
    bulkConfirmOptionalItems,
    sendOptionalItemReminder,
    getOperationalRosters,
    getParentChildFeeStructure,
    saveChildOptionalSelections,
    getStudentStatementPdf,
    getStudentStatementBase64
} = require("../controllers/finance.controller.js");

const FINANCE_DASHBOARD_ROLES = ['admin', 'school_admin', 'platform_admin', 'bursary', 'master_admin', 'finance_administrator', 'finance_admin'];
const FINANCE_OPERATIONAL_ROLES = ['admin', 'bursary', 'master_admin', 'finance_administrator', 'finance_admin'];

// ==========================================
// RECONSTRUCTED FINANCE ROUTES
// ==========================================

// 1. Fee Categories & Types
router.get("/categories", authMiddleware, authorizeFinanceAction('view'), getFeeCategories);
router.post("/categories", authMiddleware, authorizeFinanceAction('edit'), createFeeCategory);
router.get("/fee-types", authMiddleware, authorizeFinanceAction('view'), getFeeTypes);
router.post("/fee-types", authMiddleware, authorizeFinanceAction('edit'), createFeeType);
router.put("/fee-types/:id", authMiddleware, authorizeFinanceAction('edit'), updateFeeType);

// 2. Payments Inbox & Verification (Confirm, Flag, Bulk, Reverse)
router.get("/inbox", authMiddleware, authorizeFinanceAction('view'), getPaymentsInbox);
router.post("/payments/:id/confirm", authMiddleware, authorizeFinanceAction('approve'), confirmPayment);
router.post("/payments/:id/flag", authMiddleware, authorizeFinanceAction('approve'), flagPayment);
router.post("/payments/bulk-confirm", authMiddleware, authorizeFinanceAction('approve'), bulkConfirmPayments);
router.post("/payments/:id/reverse", authMiddleware, authorizeFinanceAction('approve'), reversePayment);

// 3. Settings & Configuration
router.get("/settings", authMiddleware, authorizeFinanceAction('view'), getFinanceSettings);
router.put("/settings", authMiddleware, authorizeFinanceAction('edit'), updateFinanceSettings);
router.post("/payment-methods", authMiddleware, authorizeFinanceAction('edit'), createPaymentMethod);
router.put("/payment-methods/:id", authMiddleware, authorizeFinanceAction('edit'), updatePaymentMethod);
router.post("/flag-reasons", authMiddleware, authorizeFinanceAction('edit'), createFlagReason);
router.put("/flag-reasons/:id", authMiddleware, authorizeFinanceAction('edit'), updateFlagReason);

// 4. Parent Experience & Payment Recording Flow
router.get("/parent/overview", authMiddleware, getParentFinanceOverview);
router.get("/parent/child/:studentId/payable-items", authMiddleware, getChildPayableItems);
router.post("/parent/payments/record", authMiddleware, recordParentPayment);
router.get("/parent/history", authMiddleware, getParentPaymentHistory);

// 5. Official Receipts
router.get("/receipts/:id/pdf", authMiddleware, getOfficialReceiptPdf);
router.post("/receipts/:id/compile-base64", authMiddleware, getOfficialReceiptBase64);

// 6. Fee Structures (Reconciled Builder & Details)
router.get("/structures-v2", authMiddleware, authorizeFinanceAction('view'), getFeeStructuresV2);
router.get("/structures-v2/:id/details", authMiddleware, authorizeFinanceAction('view'), getFeeStructureDetails);
router.post("/structures-v2", authMiddleware, authorizeFinanceAction('edit'), createFeeStructureV2);
router.put("/structures-v2/:id", authMiddleware, authorizeFinanceAction('edit'), updateFeeStructureV2);
router.post("/structures-v2/:id/copy", authMiddleware, authorizeFinanceAction('edit'), copyFeeStructure);
router.post("/structures-v2/bulk-increase", authMiddleware, authorizeFinanceAction('edit'), bulkPercentageIncrease);
router.post("/structures-v2/:id/publish", authMiddleware, authorizeFinanceAction('approve'), publishFeeStructure);
router.get("/structures-v2/:id/parent-preview", authMiddleware, authorizeFinanceAction('view'), getParentViewPreview);
router.get("/structures-v2/:id/pdf", authMiddleware, compileFeeStructurePdf);
router.post("/structures-v2/:id/compile-base64", authMiddleware, compileFeeStructureBase64);

// 7. Option Catalogs & Pricing Matrices
router.get("/catalogs", authMiddleware, authorizeFinanceAction('view'), getOptionCatalogs);
router.post("/catalogs", authMiddleware, authorizeFinanceAction('edit'), createOptionCatalog);
router.put("/catalogs/:id", authMiddleware, authorizeFinanceAction('edit'), updateOptionCatalog);
router.delete("/catalogs/:id", authMiddleware, authorizeFinanceAction('edit'), deleteOptionCatalog);
router.post("/catalogs/bulk-import", authMiddleware, authorizeFinanceAction('edit'), bulkImportCatalogs);

// 8. Admin Optional Items Review Queue & Operations
router.get("/optional-queue", authMiddleware, authorizeFinanceAction('view'), getOptionalItemsQueue);
router.post("/optional-queue/:selectionId/confirm-opt-out", authMiddleware, authorizeFinanceAction('edit'), confirmOptOut);
router.post("/optional-queue/mark-taking", authMiddleware, authorizeFinanceAction('edit'), markTakingItem);
router.post("/optional-queue/bulk-confirm", authMiddleware, authorizeFinanceAction('edit'), bulkConfirmOptionalItems);
router.post("/optional-queue/:selectionId/remind", authMiddleware, authorizeFinanceAction('edit'), sendOptionalItemReminder);
router.get("/optional-queue/rosters", authMiddleware, authorizeFinanceAction('view'), getOperationalRosters);

// 9. Parent Portal Extended Flow & Statements
router.get("/parent/child/:studentId/fee-structure", authMiddleware, getParentChildFeeStructure);
router.post("/parent/child/:studentId/optional-selections", authMiddleware, saveChildOptionalSelections);
router.get("/parent/statement/:studentId/pdf", authMiddleware, getStudentStatementPdf);
router.post("/parent/statement/:studentId/compile-base64", authMiddleware, getStudentStatementBase64);

// ==========================================
// LEGACY & COMPATIBILITY ROUTES
// ==========================================

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

// Fee Components
router.get("/components/:feeStructureId", authMiddleware, getFeeComponents);
router.post("/components", authMiddleware, authorizeRoles(FINANCE_OPERATIONAL_ROLES), createFeeComponent);
router.put("/components/:id", authMiddleware, authorizeRoles(FINANCE_OPERATIONAL_ROLES), updateFeeComponent);
router.delete("/components/:id", authMiddleware, authorizeRoles(FINANCE_OPERATIONAL_ROLES), deleteFeeComponent);

// Fee Discounts, Scholarships, and Hardship Waivers
router.get("/discounts/:studentId", authMiddleware, authorizeRoles(FINANCE_DASHBOARD_ROLES), getStudentDiscountsAndWaivers);
router.post("/discounts", authMiddleware, authorizeRoles(FINANCE_OPERATIONAL_ROLES), createFeeDiscountOrWaiver);
router.delete("/discounts/:id", authMiddleware, authorizeRoles(FINANCE_OPERATIONAL_ROLES), revokeFeeDiscountOrWaiver);
router.post("/discounts/:id/revoke", authMiddleware, authorizeRoles(FINANCE_OPERATIONAL_ROLES), revokeFeeDiscountOrWaiver);

// Billing Statements & Invoices
router.post("/invoices/generate", authMiddleware, authorizeRoles(FINANCE_OPERATIONAL_ROLES), generateStudentInvoice);
router.post("/invoices/item/:id/void", authMiddleware, authorizeRoles(FINANCE_OPERATIONAL_ROLES), voidStudentInvoice);
router.get("/invoices/family/:parentId", authMiddleware, getFamilyInvoice);
router.get("/invoices/:studentId", authMiddleware, getStudentInvoices);
router.get("/invoices/item/:id/pdf", authMiddleware, compileInvoicePdf);
router.post("/invoices/item/:id/compile-base64", authMiddleware, compileInvoicePdfBase64);

// Overdue Reminders Sweep
router.post("/reminders/overdue", authMiddleware, authorizeRoles(FINANCE_OPERATIONAL_ROLES), sendOverdueFeeReminders);

// Helper for Fees
router.post("/fees/pay", authMiddleware, authorizeRoles(FINANCE_OPERATIONAL_ROLES), recordFeePayment);
router.post("/fees/evidence", authMiddleware, submitPaymentEvidence); // Parents can submit
router.get("/fees/pending", authMiddleware, authorizeRoles(FINANCE_OPERATIONAL_ROLES), getPendingPayments);
router.post("/fees/confirm", authMiddleware, authorizeRoles(FINANCE_OPERATIONAL_ROLES), confirmPaymentEvidence);
router.get('/fees/:id/receipt', authMiddleware, getPaymentReceipt);
router.get('/fees/:id/receipt-pdf', authMiddleware, compilePaymentReceiptPdf);
router.post('/fees/:id/receipt-base64', authMiddleware, compilePaymentReceiptBase64);
router.get('/transactions/:id/receipt', authMiddleware, authorizeRoles(FINANCE_DASHBOARD_ROLES), getTransactionReceipt);

module.exports = router;
