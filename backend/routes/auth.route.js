const express = require("express");
const router = express.Router();
const { login, enrollUser, adminUpdateUser, deleteUser, searchUsers } = require("../controllers/auth.controller");
const { authMiddleware } = require("../middleware/auth.middleware");

router.post("/login", login);
router.post("/enroll-user", enrollUser);
router.put("/admin-update-user/:id", adminUpdateUser);
router.delete("/delete-user/:id", deleteUser);
router.get("/search-users", authMiddleware, searchUsers);

module.exports = router;
