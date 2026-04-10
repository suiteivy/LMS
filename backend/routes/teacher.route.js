const express = require("express");
const router = express.Router();
const {
    getDashboardStats,
    getAnalytics,
    getEarnings,
    getStudentPerformance
} = require("../controllers/teacher.controller.js");
const { authMiddleware } = require("../middleware/auth.middleware.js");

router.get("/dashboard/stats", authMiddleware, getDashboardStats);
router.get("/analytics", authMiddleware, getAnalytics);
router.get("/earnings", authMiddleware, getEarnings);
router.get("/students/performance", authMiddleware, getStudentPerformance);

module.exports = router;
