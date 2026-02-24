const express = require("express");
const router = express.Router();
const contactController = require("../controllers/contact.controller");

// POST /api/contact/booking
router.post("/booking", contactController.submitBooking);

module.exports = router;
