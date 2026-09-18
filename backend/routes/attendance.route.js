const express = require("express");
const router = express.Router();
const {
    getTeacherAttendance,
    markTeacherAttendance,
    confirmTeacherAttendance,
    selfMarkTeacherPresence,
    getStaffPresence,
    getStudentAttendance,
    markStudentAttendance,
    bulkMarkStudentAttendance,
    cleanupOldAttendanceRecords
} = require("../controllers/attendance.controller.js");
const { authorizeRoles } = require("../middleware/authRole.js");
const { authMiddleware } = require("../middleware/auth.middleware.js");

const { rateLimiters } = require("../middleware/rateLimiter.js");

router.use(authMiddleware);

// Teacher Attendance Routes
router.get("/teachers", authorizeRoles(["admin", "master_admin"]), getTeacherAttendance);
router.post("/teachers", authorizeRoles(["admin", "master_admin"]), markTeacherAttendance);
router.post("/teachers/confirm", authorizeRoles(["admin", "master_admin"]), confirmTeacherAttendance);
router.post("/teachers/self-checkin", authorizeRoles(["teacher"]), selfMarkTeacherPresence);
router.get("/staff-presence", authorizeRoles(["teacher", "admin", "master_admin"]), getStaffPresence);

// Student Attendance Routes
router.get("/students", authorizeRoles(["admin", "teacher"]), getStudentAttendance);
router.post("/students", authorizeRoles(["admin", "teacher"]), markStudentAttendance);
router.post("/students/bulk", rateLimiters.bulkOperations, authorizeRoles(["admin", "teacher"]), bulkMarkStudentAttendance);

// Retention cleanup (Admin only)
router.post("/cleanup", authorizeRoles(["admin"]), cleanupOldAttendanceRecords);

module.exports = router;
