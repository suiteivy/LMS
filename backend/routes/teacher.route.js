const express = require("express");
const router = express.Router();
const {
    getDashboardStats,
    getAnalytics,
    getEarnings
} = require("../controllers/teacher.controller");
const { authMiddleware } = require("../middleware/auth.middleware");

router.get("/dashboard/stats", authMiddleware, getDashboardStats);
router.get("/analytics", authMiddleware, getAnalytics);
router.get("/earnings", authMiddleware, getEarnings);

module.exports = router;
