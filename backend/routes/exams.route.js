const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth.middleware.js");
const { authorizeRoles } = require("../middleware/authRole.js");
const {
    createExam,
    getExams,
    recordExamResult,
    getExamResults
} = require("../controllers/exams.controller.js");

router.use(authMiddleware);

// Exams
router.post("/", authorizeRoles(["admin", "teacher"]), createExam);
router.get("/", authorizeRoles(["admin", "teacher", "student", "parent"]), getExams);

// Exam Results
router.post("/results", authorizeRoles(["admin", "teacher"]), recordExamResult);
router.get("/results", authorizeRoles(["admin", "teacher"]), getExamResults);

module.exports = router;
