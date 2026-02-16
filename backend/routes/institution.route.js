const express = require("express");
const router = express.Router();
const {
  createInstitution,
  getInstitutions,
  getClasses,
} = require("../controllers/institution.controller");
const { authMiddleware } = require("../middleware/auth.middleware");

router.post("/", authMiddleware, createInstitution); // 🔐 Protected
router.get("/", getInstitutions);
router.get("/classes", authMiddleware, getClasses);

module.exports = router;
