const express = require("express");
const router = express.Router();
const {
  login,
  enrollUser,
  adminUpdateUser,
  deleteUser,
  markUserAsLeaver,
  reactivateUser,
  searchUsers,
  logout,
  changePassword,
  completeCredentialSetup,
  forgotPassword,
  checkPasswordRecoveryEmail,
  resetPassword,
  adminResetPassword,
  setupSecurityQuestions,
  verifySecurityQuestions,
  getCredentialDeliveryByToken,
  consumeCredentialDeliveryToken,
  transferMainAdmin,
  getInstitutionAdmins,
  updateAdminDelegation,
  getActiveSessions,
  revokeSession,
  revokeAllOtherSessions,
  pingSession,
  getEnrollmentSlotCapacity,
  requestPasswordResetEscalation,
  createCredentialRequest,
  getMyCredentialRequests,
  getCredentialRequests,
  approveCredentialRequest,
  rejectCredentialRequest,
} = require("../controllers/auth.controller.js");
const { authMiddleware } = require("../middleware/auth.middleware.js");
const checkSubscription = require("../middleware/subscriptionCheck.js");
const { validate, schemas } = require("../middleware/inputValidator.js");
const { rateLimiters } = require("../middleware/rateLimiter.js");
const { requireAdmin, requireRole } = require("../middleware/roleCheck.js");

// Public: Login with validation and attempt rate limiting
router.post("/login", rateLimiters.authLogin, validate(schemas.login), login);

// Public: Password reset with strict rate limiting
router.post(
  "/forgot-password",
  rateLimiters.passwordResetRequest,
  validate({ email: schemas.login.email }),
  forgotPassword,
);
router.get("/forgot-password/check-email", rateLimiters.passwordResetCheckEmail, checkPasswordRecoveryEmail);
router.post("/forgot-password/escalate", rateLimiters.passwordResetRequest, requestPasswordResetEscalation);
router.post("/reset-password", rateLimiters.passwordResetRequest, resetPassword);
router.post("/verify-security-questions", rateLimiters.passwordResetVerify, verifySecurityQuestions);
router.get("/credential-delivery/:token", getCredentialDeliveryByToken);
router.post("/credential-delivery/:token/consume", authMiddleware, consumeCredentialDeliveryToken);

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
router.patch(
  "/users/:id/mark-leaver",
  authMiddleware,
  checkSubscription,
  requireAdmin,
  validate(schemas.idParam),
  markUserAsLeaver,
);
router.patch(
  "/users/:id/reactivate",
  authMiddleware,
  checkSubscription,
  requireAdmin,
  validate(schemas.idParam),
  reactivateUser,
);

// Generic auth routes
router.get(
  "/enrollment-slot-capacity",
  authMiddleware,
  checkSubscription,
  requireRole('admin', 'master_admin'),
  getEnrollmentSlotCapacity,
);

router.get(
  "/search-users",
  authMiddleware,
  rateLimiters.search,
  searchUsers,
);
router.post("/logout", authMiddleware, logout);

// Password management
router.put("/change-password", authMiddleware, changePassword);
router.post("/complete-credential-setup", authMiddleware, completeCredentialSetup);
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

router.get(
  '/institution-admins',
  authMiddleware,
  requireRole('admin', 'master_admin'),
  getInstitutionAdmins,
);

router.put(
  '/admin-delegation',
  authMiddleware,
  requireRole('admin', 'master_admin'),
  updateAdminDelegation,
);

// Credential Change Requests (Name Change & Email Reset)
router.post("/credential-requests", authMiddleware, createCredentialRequest);
router.get("/credential-requests/me", authMiddleware, getMyCredentialRequests);
router.get("/credential-requests", authMiddleware, requireRole('admin', 'master_admin'), getCredentialRequests);
router.post("/credential-requests/:id/approve", authMiddleware, requireRole('admin', 'master_admin'), approveCredentialRequest);
router.post("/credential-requests/:id/reject", authMiddleware, requireRole('admin', 'master_admin'), rejectCredentialRequest);

module.exports = router;
