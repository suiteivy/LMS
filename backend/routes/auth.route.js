const express = require("express");
const router = express.Router();
// const {
//   login,
//   enrollUser,
//   adminUpdateUser,
//   deleteUser,
//   searchUsers,
//   logout,
//   changePassword,
//   completeCredentialSetup,
//   forgotPassword,
//   checkPasswordRecoveryEmail,
//   resetPassword,
//   adminResetPassword,
//   setupSecurityQuestions,
//   verifySecurityQuestions,
//   getCredentialDeliveryByToken,
//   transferMainAdmin,
//   getInstitutionAdmins,
//   updateAdminDelegation,
//   getActiveSessions,
//   revokeSession,
//   revokeAllOtherSessions,
//   pingSession,
//   getEnrollmentSlotCapacity,
// } = require("../controllers/auth.controller.js");

const authController = require("../controllers/auth.controller.js");

console.log("AUTH CONTROLLER EXPORTS:");
console.log(Object.keys(authController));

console.log(
  "checkPasswordRecoveryEmail:",
  typeof authController.checkPasswordRecoveryEmail
);
const {
  login,
  enrollUser,
  adminUpdateUser,
  deleteUser,
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
  transferMainAdmin,
  getInstitutionAdmins,
  updateAdminDelegation,
  getActiveSessions,
  revokeSession,
  revokeAllOtherSessions,
  pingSession,
  getEnrollmentSlotCapacity,
} = authController;

const { authMiddleware } = require("../middleware/auth.middleware.js");
const checkSubscription = require("../middleware/subscriptionCheck.js");
const { validate, schemas } = require("../middleware/inputValidator.js");
const { rateLimiters } = require("../middleware/rateLimiter.js");
// const rateLimiterModule = require("../middleware/rateLimiter.js");
// const { rateLimiters } = require("../middleware/rateLimiter.js").rateLimiters;
const { requireAdmin, requireRole } = require("../middleware/roleCheck.js");

// DEBUG: Log what was imported
console.log('rateLimiters keys:', Object.keys(rateLimiters));
console.log('passwordResetCheckEmail exists?', !!rateLimiters.passwordResetCheckEmail);
console.log('Type of passwordResetCheckEmail:', typeof rateLimiters.passwordResetCheckEmail);

// Public: Login with validation
router.post("/login", validate(schemas.login), login);

console.log(
  "passwordResetRequest:",
  typeof rateLimiters.passwordResetRequest
);

console.log(
  "validate:",
  typeof validate
);

console.log(
  "schemas.login:",
  schemas.login
);

console.log(
  "validate(...) returns:",
  typeof validate({ email: schemas.login.email })
);

console.log(
  "forgotPassword:",
  typeof forgotPassword
);

// Public: Password reset with strict rate limiting
router.post(
  "/forgot-password",
  rateLimiters.passwordResetRequest,
  validate({ email: schemas.login.email }),
  forgotPassword,
);
router.get("/forgot-password/check-email", rateLimiters.passwordResetCheckEmail, checkPasswordRecoveryEmail);
router.post("/reset-password", rateLimiters.passwordResetRequest, resetPassword);
router.post("/verify-security-questions", rateLimiters.passwordResetVerify, verifySecurityQuestions);
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

module.exports = router;
