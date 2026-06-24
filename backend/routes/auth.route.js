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
  adminResetPassword,
  setupSecurityQuestions,
  verifySecurityQuestions,
  getCredentialDeliveryByToken,
  transferMainAdmin,
  getActiveSessions,
  revokeSession,
  revokeAllOtherSessions,
  pingSession,
} = require("../controllers/auth.controller.js");
const { authMiddleware } = require("../middleware/auth.middleware.js");
const checkSubscription = require("../middleware/subscriptionCheck.js");
const { validate, schemas } = require("../middleware/inputValidator.js");
const { rateLimiters } = require("../middleware/rateLimiter.js");
const { requireAdmin } = require("../middleware/roleCheck.js");

// Public: Login with validation
router.post("/login", validate(schemas.login), login);

// Public: Password reset with strict rate limiting
router.post(
  "/forgot-password",
  rateLimiters.passwordReset,
  validate({ email: schemas.login.email }),
  forgotPassword,
);
router.post("/reset-password", rateLimiters.passwordReset, resetPassword);
router.post("/verify-security-questions", rateLimiters.passwordReset, verifySecurityQuestions);
router.get("/credential-delivery/:token", getCredentialDeliveryByToken);

// Protected: User management with subscription check, admin role check, and validation
router.post(
  "/enroll-user",
  authMiddleware,
  checkSubscription,
  requireAdmin,
  validate(schemas.enrollUser),
  enrollUser,
);
router.put(
  "/admin-update-user/:id",
  authMiddleware,
  checkSubscription,
  requireAdmin,
  validate(schemas.updateUser),
  adminUpdateUser,
);
router.delete(
  "/delete-user/:id",
  authMiddleware,
  checkSubscription,
  requireAdmin,
  validate(schemas.idParam),
  deleteUser,
);

// Generic auth routes
router.get(
  "/search-users",
  authMiddleware,
  rateLimiters.search,
  searchUsers,
);
router.post("/logout", authMiddleware, logout);

// Password management
router.put("/change-password", authMiddleware, changePassword);
router.post("/admin-reset-password", authMiddleware, adminResetPassword);
router.post("/security-questions/setup", authMiddleware, setupSecurityQuestions);

// Session management
router.get("/sessions", authMiddleware, getActiveSessions);
router.post("/sessions/revoke", authMiddleware, revokeSession);
router.post("/sessions/revoke-others", authMiddleware, revokeAllOtherSessions);
router.post("/ping", authMiddleware, pingSession);

// Main Admin Management
router.post(
  "/transfer-main",
  authMiddleware,
  requireAdmin,
  transferMainAdmin,
);

module.exports = router;
