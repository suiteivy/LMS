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
    authorizeRoles(["admin", "master_admin"]),
    createTimetableEntry
);

router.put(
    "/:id",
    authMiddleware,
    authorizeRoles(["admin", "master_admin"]),
    updateTimetableEntry
);

router.delete(
    "/:id",
    authMiddleware,
    authorizeRoles(["admin", "master_admin"]),
    deleteTimetableEntry
);

// View: Class timetable
router.get("/class/:class_id", authMiddleware, authorizeRoles(["admin", "teacher", "student", "parent"]), getClassTimetable);

// View: Teacher's own timetable
router.get("/teacher", authMiddleware, authorizeRoles(["teacher"]), getTeacherTimetable);

// View: Specific teacher's timetable (Admins/Master Admins)
router.get("/teacher/:teacher_id", authMiddleware, authorizeRoles(["admin", "master_admin"]), getTeacherTimetable);

module.exports = router;
