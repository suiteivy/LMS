// routes/settings.route.js
const express = require("express");
const router = express.Router();
const settingsController = require("../controllers/settings.controller");
const { authMiddleware } = require("../middleware/auth.middleware");

// Public-ish (Authenticated) read
router.get("/currency", authMiddleware, settingsController.getCurrencyRates);

// Admin only (Trigger update)
router.post("/currency/update", authMiddleware, (req, res, next) => {
    if (req.userRole !== 'admin') return res.status(403).json({ error: "Unauthorized" });
    next();
}, settingsController.updateCurrencyRates);

module.exports = router;
