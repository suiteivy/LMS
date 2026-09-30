const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth.middleware.js");
const { authorizeRoles } = require("../middleware/authRole.js");
const {
  getSubjectCategories,
  createSubjectCategory,
  updateSubjectCategory,
  deleteSubjectCategory,
} = require("../controllers/subject.controller.js");

router.use(authMiddleware);

// Get all categories for an institution
router.get("/", authorizeRoles(["admin", "master_admin", "teacher", "student", "parent"]), getSubjectCategories);

// Create new category
router.post("/", authorizeRoles(["admin", "master_admin"]), createSubjectCategory);

// Update category
router.put("/:id", authorizeRoles(["admin", "master_admin"]), updateSubjectCategory);

// Delete category
router.delete("/:id", authorizeRoles(["admin", "master_admin"]), deleteSubjectCategory);

module.exports = router;
