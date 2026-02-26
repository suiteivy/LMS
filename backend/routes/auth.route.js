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
const { validate, schemas } = require("../middleware/inputValidator");
const { rateLimiters } = require("../middleware/rateLimiter");
const { requireAdmin } = require("../middleware/roleCheck");

// Public: Login with validation
router.post("/login", validate(schemas.login), login);

// Public: Password reset with strict rate limiting
router.post("/forgot-password", rateLimiters.passwordReset, validate({ email: schemas.login.email }), forgotPassword);
router.post("/reset-password", rateLimiters.passwordReset, resetPassword);

// Protected: User management with subscription check, admin role check, and validation
router.post("/enroll-user", checkSubscription, requireAdmin, validate(schemas.enrollUser), enrollUser);
router.put("/admin-update-user/:id", checkSubscription, requireAdmin, validate(schemas.updateUser), adminUpdateUser);
router.delete("/delete-user/:id", checkSubscription, requireAdmin, validate(schemas.idParam), deleteUser);

// Generic auth routes
router.get("/search-users", authMiddleware, searchUsers);
router.post("/logout", authMiddleware, logout);

// Password management
router.put("/change-password", authMiddleware, changePassword);

// Master Admin Management
router.post("/transfer-master", authMiddleware, requireAdmin, transferMasterAdmin);

module.exports = router;
