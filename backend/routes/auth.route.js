const express = require("express");
const router = express.Router();
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

module.exports = router;
