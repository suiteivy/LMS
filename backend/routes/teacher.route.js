const express = require("express");
const router = express.Router();
const {
    getDashboardStats,
    getAnalytics,
    getEarnings,
    getStudentPerformance,
    getStudentDetails,
    getSubjectClasses,
    listClassStudents
} = require("../controllers/teacher.controller.js");
const { authMiddleware } = require("../middleware/auth.middleware.js");
const { authorizeRoles } = require("../middleware/authRole.js");

router.use(authMiddleware);
router.use(authorizeRoles(["teacher"]));

router.get("/dashboard/stats", getDashboardStats);
router.get("/analytics", getAnalytics);
router.get("/earnings", getEarnings);
router.get("/subject-classes", getSubjectClasses);
router.get("/list-students", listClassStudents);
router.get("/students/performance", getStudentPerformance);
router.get("/students/:studentId/details", getStudentDetails);

module.exports = router;
