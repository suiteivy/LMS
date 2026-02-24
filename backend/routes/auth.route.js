const express = require("express");
const router = express.Router();
const { login, enrollUser, adminUpdateUser, deleteUser } = require("../controllers/auth.controller");
const checkSubscription = require("../middleware/subscriptionCheck");

router.post("/login", login);

// Protect user management routes
router.post("/enroll-user", checkSubscription, enrollUser);
router.put("/admin-update-user/:id", checkSubscription, adminUpdateUser);
router.delete("/delete-user/:id", checkSubscription, deleteUser);

module.exports = router;
