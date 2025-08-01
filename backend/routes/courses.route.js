const express = require("express");
const router = express.Router();
const {
  createCourse,
  getCourses,
} = require("../controllers/course.controller");

const { authMiddleware } = require("../middleware/auth.middleware");

router.post("/", authMiddleware, createCourse);
router.get("/", authMiddleware, getCourses);

module.exports = router;
