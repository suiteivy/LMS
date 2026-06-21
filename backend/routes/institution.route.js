const express = require("express");
const router = express.Router();
const {
  createInstitution,
  getInstitutions,
  getInstitutionDetails,
  updateInstitution,
  getClasses,
} = require("../controllers/institution.controller.js");
const { authMiddleware } = require("../middleware/auth.middleware.js");
const { authorizeRoles } = require("../middleware/authRole.js");
const { validate, schemas } = require("../middleware/inputValidator.js");

// All routes require authentication
router.use(authMiddleware);

// Get own institution details
router.get("/details", getInstitutionDetails);

// Get classes
router.get("/classes", getClasses);

// List all institutions (Master Admin only)
router.get("/", authorizeRoles(["master_admin"]), getInstitutions);

// Create new institution (Master Admin only)
router.post("/", authorizeRoles(["master_admin"]), validate(schemas.createInstitution), createInstitution);

// Update institution
router.put("/", authorizeRoles(["admin", "master_admin"]), validate(schemas.updateUser), updateInstitution);
router.put("/:id", authorizeRoles(["admin", "master_admin"]), validate(schemas.idParam), updateInstitution);

module.exports = router;
