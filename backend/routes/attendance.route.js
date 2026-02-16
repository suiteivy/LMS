const express = require("express");
const router = express.Router();
const {
    getTeacherAttendance,
    markTeacherAttendance,
} = require("../controllers/attendance.controller");
const { authMiddleware } = require("../middleware/auth.middleware");

// Teacher Attendance Routes
router.get("/teachers", authMiddleware, getTeacherAttendance);
router.post("/teachers", authMiddleware, markTeacherAttendance);

module.exports = router;
