const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth.middleware");
const { authorizeRoles } = require("../middleware/authRole");
const { getMyFinance, getMyTimetable, getMyAnnouncements } = require("../controllers/student.controller");

// All routes require authentication
router.use(authMiddleware);

// Get My Finance Data (Student only)
router.get("/me/finance", authorizeRoles(['student']), getMyFinance);

// Get My Timetable (Student only)
router.get("/me/timetable", authorizeRoles(['student']), getMyTimetable);

// Get My Announcements (Student only)
router.get("/me/announcements", authorizeRoles(['student']), getMyAnnouncements);

module.exports = router;
