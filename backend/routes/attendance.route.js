const express = require("express");
const router = express.Router();
const {
    getTeacherAttendance,
    markTeacherAttendance,
    selfMarkTeacherPresence,
    getStudentAttendance,
    markStudentAttendance,
    bulkMarkStudentAttendance,
    cleanupOldAttendanceRecords
} = require("../controllers/attendance.controller.js");
const { authorizeRoles } = require("../middleware/authRole.js");
const { authMiddleware } = require("../middleware/auth.middleware.js");

router.use(authMiddleware);

// Teacher Attendance Routes
router.get("/teachers", authorizeRoles(["admin"]), getTeacherAttendance);
router.post("/teachers", authorizeRoles(["admin"]), markTeacherAttendance);
router.post("/teachers/self-checkin", authorizeRoles(["teacher"]), selfMarkTeacherPresence);

// Student Attendance Routes
router.get("/students", authorizeRoles(["admin", "teacher"]), getStudentAttendance);
router.post("/students", authorizeRoles(["admin", "teacher"]), markStudentAttendance);
router.post("/students/bulk", authorizeRoles(["admin", "teacher"]), bulkMarkStudentAttendance);

// Retention cleanup (Admin only)
router.post("/cleanup", authorizeRoles(["admin"]), cleanupOldAttendanceRecords);

module.exports = router;
