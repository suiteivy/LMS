const express = require("express");
const router = express.Router();

const { authMiddleware } = require("../middleware/auth.middleware");
const {
  enrollStudentInCourse,
  getCourses,
  getCourseById,
  createCourse,
} = require("../controllers/course.controller");

// Create a new course
router.post("/", authMiddleware, createCourse);

// Get all courses for an institution
router.get("/", authMiddleware, getCourses);

// Get courses filtered by user role and ID
// router.get("/filtered", authMiddleware, getFilteredCourses);

// Get course by ID with role-based access control
router.get("/:id", authMiddleware, getCourseById);

// Enroll in a course (requires authentication)
router.post("/enroll", authMiddleware, enrollStudentInCourse);

module.exports = router;
