const express = require("express");
const router = express.Router();
const { login, enrollUser, adminUpdateUser, deleteUser, searchUsers, logout } = require("../controllers/auth.controller");
const { authMiddleware } = require("../middleware/auth.middleware");

router.post("/login", login);
router.post("/enroll-user", enrollUser);
router.put("/admin-update-user/:id", adminUpdateUser);
router.delete("/delete-user/:id", deleteUser);
router.get("/search-users", authMiddleware, searchUsers);
router.post("/logout", authMiddleware, logout);

module.exports = router;
