const express = require("express");
const router = express.Router();
const {
    getTeacherAttendance,
    markTeacherAttendance,
    getStudentAttendance,
    markStudentAttendance
} = require("../controllers/attendance.controller.js");
const { authorizeRoles } = require("../middleware/authRole.js");
const { authMiddleware } = require("../middleware/auth.middleware.js");

router.use(authMiddleware);

// Teacher Attendance Routes (Admin only)
router.get("/teachers", authorizeRoles(["admin"]), getTeacherAttendance);
router.post("/teachers", authorizeRoles(["admin"]), markTeacherAttendance);

// Student Attendance Routes (Teachers/Admins)
router.get("/students", authorizeRoles(["admin", "teacher"]), getStudentAttendance);
router.post("/students", authorizeRoles(["admin", "teacher"]), markStudentAttendance);

module.exports = router;
