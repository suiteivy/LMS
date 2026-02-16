const express = require("express");
const router = express.Router();
const { login, enrollUser, adminUpdateUser } = require("../controllers/auth.controller");

router.post("/login", login);
router.post("/enroll-user", enrollUser);
router.put("/admin-update-user/:id", adminUpdateUser);

module.exports = router;
