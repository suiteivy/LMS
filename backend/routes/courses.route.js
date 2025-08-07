const express = require("express");
const router = express.Router();
const {
  createCourse,
  getCourses,
  // getFilteredCourses,
  getCourseById
} = require("../controllers/course.controller");

const { authMiddleware } = require("../middleware/auth.middleware");

// Create a new course
router.post("/", authMiddleware, createCourse);

// Get all courses for an institution
router.get("/", authMiddleware, getCourses);

// Get courses filtered by user role and ID
// router.get("/filtered", authMiddleware, getFilteredCourses);

// Get course by ID with role-based access control
router.get("/:id", authMiddleware, getCourseById);

module.exports = router;
