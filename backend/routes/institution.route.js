const express = require("express");
const router = express.Router();
const {
  createInstitution,
  getInstitutions,
  getInstitutionDetails,
  updateInstitution,
  getClasses,
} = require("../controllers/institution.controller");
const { authMiddleware } = require("../middleware/auth.middleware");

router.post("/", authMiddleware, createInstitution); // 🔐 Protected
router.get("/", getInstitutions);
router.get("/details", authMiddleware, getInstitutionDetails);
router.put("/", authMiddleware, updateInstitution); // Update own institution
router.put("/:id", authMiddleware, updateInstitution); // Update specific institution (admin)
router.get("/classes", authMiddleware, getClasses);

module.exports = router;
