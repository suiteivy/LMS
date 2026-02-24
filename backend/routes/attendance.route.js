const express = require("express");
const router = express.Router();
const {
    getTeacherAttendance,
    markTeacherAttendance,
    getStudentAttendance,
    markStudentAttendance
} = require("../controllers/attendance.controller");
const { authMiddleware } = require("../middleware/auth.middleware");

// Teacher Attendance Routes (Admin only usually)
router.get("/teachers", authMiddleware, getTeacherAttendance);
router.post("/teachers", authMiddleware, markTeacherAttendance);

// Student Attendance Routes (Teachers/Admins)
router.get("/students", authMiddleware, getStudentAttendance);
router.post("/students", authMiddleware, markStudentAttendance);

module.exports = router;
