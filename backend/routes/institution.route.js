const express = require("express");
const router = express.Router();
const {
  createInstitution,
  getInstitutions,
} = require("../controllers/institution.controller");
const { authMiddleware } = require("../middleware/auth.middleware");

router.post("/", authMiddleware, createInstitution); // 🔐 Protected
router.get("/", getInstitutions); // Public or also protect if needed

module.exports = router;
