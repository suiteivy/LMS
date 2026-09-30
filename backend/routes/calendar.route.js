const express = require("express");
const router = express.Router();
const {
  getEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  getCancelledDates,
  getNationalHolidays,
  syncNationalHolidays,
  setHolidayDecision,
} = require("../controllers/calendar.controller.js");
const { authMiddleware } = require("../middleware/auth.middleware.js");
const { authorizeRoles } = require("../middleware/authRole.js");

// Require authentication for all calendar routes
router.use(authMiddleware);

// Public to all authenticated users of the institution
router.get("/events", getEvents);
router.get("/cancelled-dates", getCancelledDates);

// National holidays (read for all, write for admins)
router.get("/holidays", getNationalHolidays);
router.post("/holidays/sync", authorizeRoles(["admin", "master_admin"]), syncNationalHolidays);
router.post("/holidays/:id/decision", authorizeRoles(["admin", "master_admin"]), setHolidayDecision);

// Admin-only management
router.post("/events", authorizeRoles(["admin", "master_admin"]), createEvent);
router.put("/events/:id", authorizeRoles(["admin", "master_admin"]), updateEvent);
router.delete("/events/:id", authorizeRoles(["admin", "master_admin"]), deleteEvent);

module.exports = router;
