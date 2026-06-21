const express = require("express");
const router = express.Router();
const {
    getDashboardStats,
    getAnalytics,
    getEarnings,
    getStudentPerformance
} = require("../controllers/teacher.controller.js");
const { authMiddleware } = require("../middleware/auth.middleware.js");
const { authorizeRoles } = require("../middleware/authRole.js");

router.use(authMiddleware);
router.use(authorizeRoles(["teacher"]));

router.get("/dashboard/stats", getDashboardStats);
router.get("/analytics", getAnalytics);
router.get("/earnings", getEarnings);
router.get("/students/performance", getStudentPerformance);

module.exports = router;
