const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth.middleware.js");
const { authorizeRoles } = require("../middleware/authRole.js");
const {
    createExam,
    getExams,
    recordExamResult,
    getExamResults,
    getExamById,
    getExamRoster
} = require("../controllers/exams.controller.js");

router.use(authMiddleware);

// Exams
router.post("/", authorizeRoles(["admin", "teacher"]), createExam);
router.get("/", authorizeRoles(["admin", "teacher", "student", "parent"]), getExams);

// Exam Results
router.post("/results", authorizeRoles(["admin", "teacher"]), recordExamResult);
router.get("/results", authorizeRoles(["admin", "teacher"]), getExamResults);
router.get("/:examId/roster", authorizeRoles(["admin", "teacher"]), getExamRoster);
router.get("/:examId", authorizeRoles(["admin", "teacher"]), getExamById);

module.exports = router;
