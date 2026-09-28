// routes/timetable.route.js
const express = require("express");
const {
    getTimetableConfig,
    saveTimetableConfig,
    getTimetableReadiness,
    generateTimetable,
    publishTimetable,
    liveCheckConflict,
    createTimetableEntry,
    getClassTimetable,
    getTeacherTimetable,
    updateTimetableEntry,
    deleteTimetableEntry,
} = require("../controllers/timetable.controller.js");
const { authMiddleware } = require("../middleware/auth.middleware.js");
const { authorizeRoles } = require("../middleware/authRole.js");

const router = express.Router();

// ── Configuration & Automatic Builder Routes (Admin only) ─────────────────────

router.get(
    "/config",
    authMiddleware,
    authorizeRoles(["admin", "master_admin"]),
    getTimetableConfig
);

router.put(
    "/config",
    authMiddleware,
    authorizeRoles(["admin", "master_admin"]),
    saveTimetableConfig
);

router.get(
    "/readiness",
    authMiddleware,
    authorizeRoles(["admin", "master_admin"]),
    getTimetableReadiness
);

router.post(
    "/generate",
    authMiddleware,
    authorizeRoles(["admin", "master_admin"]),
    generateTimetable
);

router.post(
    "/publish",
    authMiddleware,
    authorizeRoles(["admin", "master_admin"]),
    publishTimetable
);

router.post(
    "/check-conflict",
    authMiddleware,
    authorizeRoles(["admin", "master_admin"]),
    liveCheckConflict
);

// ── Standard CRUD Routes ──────────────────────────────────────────────────────

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

// ── View Routes ───────────────────────────────────────────────────────────────

// View: Class timetable
router.get("/class/:class_id", authMiddleware, authorizeRoles(["admin", "teacher", "student", "parent"]), getClassTimetable);

// View: Teacher's own timetable
router.get("/teacher", authMiddleware, authorizeRoles(["teacher"]), getTeacherTimetable);

// View: Specific teacher's timetable (Admins/Master Admins)
router.get("/teacher/:teacher_id", authMiddleware, authorizeRoles(["admin", "master_admin"]), getTeacherTimetable);

module.exports = router;
