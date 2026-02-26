const express = require("express");
const router = express.Router();
const {
    login,
    enrollUser,
    adminUpdateUser,
    deleteUser,
    searchUsers,
    logout,
    changePassword,
    forgotPassword,
    resetPassword,
    transferMasterAdmin
} = require("../controllers/auth.controller");
const { authMiddleware } = require("../middleware/auth.middleware");
const checkSubscription = require("../middleware/subscriptionCheck");

router.post("/login", login);

// Protect user management routes with subscription checks (Trial Branch)
router.post("/enroll-user", checkSubscription, enrollUser);
router.put("/admin-update-user/:id", checkSubscription, adminUpdateUser);
router.delete("/delete-user/:id", checkSubscription, deleteUser);

// Generic auth routes
router.get("/search-users", authMiddleware, searchUsers);
router.post("/logout", authMiddleware, logout);

// Password management
router.put("/change-password", authMiddleware, changePassword);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

// Master Admin Management
router.post("/transfer-master", authMiddleware, transferMasterAdmin);

module.exports = router;
