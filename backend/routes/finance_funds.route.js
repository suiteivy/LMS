// routes/finance.route.js
const express = require("express");
const {
    createFund,
    getFunds,
    createAllocation,
    getAllocations,
} = require("../controllers/finance.controller");
const { authMiddleware } = require("../middleware/auth.middleware");
const { authorizeRoles } = require("../middleware/authRole");

const router = express.Router();

// Funds
router.post("/funds", authMiddleware, authorizeRoles(["admin"]), createFund);
router.get("/funds", authMiddleware, authorizeRoles(["admin"]), getFunds);

// Allocations
router.post("/allocations", authMiddleware, authorizeRoles(["admin"]), createAllocation);
router.get("/allocations/:fund_id", authMiddleware, authorizeRoles(["admin"]), getAllocations);

module.exports = router;
