const express = require("express");
const router = express.Router();

const { authMiddleware } = require("../middleware/auth.middleware.js");
const {
  enrollStudentInSubject,
  getSubjects,
  getSubjectById,
  createSubject,
  getFilteredSubjects,
  getSubjectsByClass,
  updateProgress,
} = require("../controllers/subject.controller.js");

const { authorizeRoles } = require("../middleware/authRole.js");

router.use(authMiddleware);

// Create a new subject
router.post("/", authorizeRoles(["admin", "master_admin"]), createSubject);

// Get all subjects for an institution
router.get("/", authorizeRoles(["admin", "teacher", "student", "parent"]), getSubjects);

// Get subjects filtered by user role and ID
router.get("/filtered", authorizeRoles(["admin", "teacher", "student", "parent"]), getFilteredSubjects);

// Get subjects by class ID
router.get("/class/:classId", authorizeRoles(["admin", "teacher", "student", "parent"]), getSubjectsByClass);

// Get subject by ID
router.get("/:id", authorizeRoles(["admin", "teacher", "student", "parent"]), getSubjectById);

// Enroll in a subject
router.post("/enroll", authorizeRoles(["admin", "teacher", "student"]), enrollStudentInSubject);

// Update subject progress
router.patch("/:id/progress", authorizeRoles(["admin", "teacher"]), updateProgress);

module.exports = router;
