const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth.middleware.js");
const { authorizeRoles } = require("../middleware/authRole.js");
const { getMyFinance, getMyTimetable, getMyAnnouncements, listStudents } = require("../controllers/student.controller.js");

// All routes require authentication
router.use(authMiddleware);

// Get My Finance Data (Student only)
router.get("/me/finance", authorizeRoles(['student']), getMyFinance);

// Get My Timetable (Student only)
router.get("/me/timetable", authorizeRoles(['student']), getMyTimetable);

// Get My Announcements (Student only)
router.get("/me/announcements", authorizeRoles(['student']), getMyAnnouncements);

// List Students (Teacher/Admin only)
router.get("/list", authorizeRoles(['teacher', 'admin']), listStudents);

module.exports = router;
