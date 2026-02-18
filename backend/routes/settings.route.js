// routes/settings.route.js
const express = require("express");
const router = express.Router();
const settingsController = require("../controllers/settings.controller");
const { verifyToken } = require("../middleware/auth.middleware");

// Public-ish (Authenticated) read
router.get("/currency", verifyToken, settingsController.getCurrencyRates);

// Admin only (Trigger update)
router.post("/currency/update", verifyToken, (req, res, next) => {
    if (req.userRole !== 'admin') return res.status(403).json({ error: "Unauthorized" });
    next();
}, settingsController.updateCurrencyRates);

module.exports = router;
