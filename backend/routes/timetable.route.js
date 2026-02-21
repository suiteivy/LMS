// routes/timetable.route.js
const express = require("express");
const {
    createTimetableEntry,
    getClassTimetable,
    getTeacherTimetable,
    updateTimetableEntry,
    deleteTimetableEntry,
} = require("../controllers/timetable.controller");
const { authMiddleware } = require("../middleware/auth.middleware");
const { authorizeRoles } = require("../middleware/authRole");

const router = express.Router();

// Admin: Manage timetables
router.post(
    "/",
    authMiddleware,
    authorizeRoles(["admin"]),
    createTimetableEntry
);

router.put(
    "/:id",
    authMiddleware,
    authorizeRoles(["admin"]),
    updateTimetableEntry
);

router.delete(
    "/:id",
    authMiddleware,
    authorizeRoles(["admin"]),
    deleteTimetableEntry
);

// View: Class timetable (public/student/teacher/admin likely needs access)
// For now, allow authenticated users
router.get("/class/:class_id", authMiddleware, getClassTimetable);

// View: Teacher's own timetable (must be before :teacher_id route)
router.get("/teacher", authMiddleware, getTeacherTimetable);

// View: Specific teacher's timetable
router.get("/teacher/:teacher_id", authMiddleware, getTeacherTimetable);

module.exports = router;
