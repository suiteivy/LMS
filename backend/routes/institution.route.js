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
const { validate, schemas } = require("../middleware/inputValidator");
const { requireAdmin } = require("../middleware/roleCheck");

// Public: List all institutions
router.get("/", getInstitutions);

// Protected: Create new institution (requires admin)
router.post("/", authMiddleware, requireAdmin, validate(schemas.createInstitution), createInstitution);

// Protected: Get own institution details
router.get("/details", authMiddleware, getInstitutionDetails);

// Protected: Update institution
router.put("/", authMiddleware, requireAdmin, validate(schemas.updateUser), updateInstitution);
router.put("/:id", authMiddleware, requireAdmin, validate(schemas.idParam), updateInstitution);

// Protected: Get classes
router.get("/classes", authMiddleware, getClasses);

module.exports = router;
