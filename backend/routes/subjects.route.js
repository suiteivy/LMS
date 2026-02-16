const express = require("express");
const router = express.Router();

const { authMiddleware } = require("../middleware/auth.middleware");
const {
  enrollStudentInSubject,
  getSubjects,
  getSubjectById,
  createSubject,
  getFilteredSubjects,
  getSubjectsByClass,
} = require("../controllers/subject.controller");

// Create a new subject
router.post("/", authMiddleware, createSubject);

// Get all subjects for an institution (no role-based filtering)
router.get("/", authMiddleware, getSubjects);

// Get subjects filtered by user role and ID
router.get("/filtered", authMiddleware, getFilteredSubjects);

// Get subjects by class ID
router.get("/class/:classId", authMiddleware, getSubjectsByClass);

// Get subject by ID with role-based access control
router.get("/:id", authMiddleware, getSubjectById);

// Enroll in a subject (requires authentication)
router.post("/enroll", authMiddleware, enrollStudentInSubject);

module.exports = router;
