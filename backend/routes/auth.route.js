const express = require("express");
const router = express.Router();
const { login, enrollUser, adminUpdateUser, deleteUser } = require("../controllers/auth.controller");

router.post("/login", login);
router.post("/enroll-user", enrollUser);
router.put("/admin-update-user/:id", adminUpdateUser);
router.delete("/delete-user/:id", deleteUser);

module.exports = router;
