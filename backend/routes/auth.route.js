const express = require("express");
const router = express.Router();
<<<<<<< HEAD
const { login, enrollUser, adminUpdateUser, deleteUser } = require("../controllers/auth.controller");
const checkSubscription = require("../middleware/subscriptionCheck");

router.post("/login", login);

// Protect user management routes
router.post("/enroll-user", checkSubscription, enrollUser);
router.put("/admin-update-user/:id", checkSubscription, adminUpdateUser);
router.delete("/delete-user/:id", checkSubscription, deleteUser);
=======
const { login, enrollUser, adminUpdateUser, deleteUser, searchUsers, logout, changePassword, forgotPassword, resetPassword } = require("../controllers/auth.controller");
const { authMiddleware } = require("../middleware/auth.middleware");

router.post("/login", login);
router.post("/enroll-user", enrollUser);
router.put("/admin-update-user/:id", adminUpdateUser);
router.delete("/delete-user/:id", deleteUser);
router.get("/search-users", authMiddleware, searchUsers);
router.post("/logout", authMiddleware, logout);

// Password management
router.put("/change-password", authMiddleware, changePassword);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
>>>>>>> main

module.exports = router;
