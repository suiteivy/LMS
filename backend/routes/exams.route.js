const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth.middleware.js");
const { authorizeRoles } = require("../middleware/authRole.js");
const {
    createExam,
    getExams,
    updateExam,
    deleteExam,
    recordExamResult,
    getExamResults,
    getExamById,
    getExamRoster,
    getExamPeriods,
    createExamPeriod,
    updateExamPeriod,
    deleteExamPeriod
} = require("../controllers/exams.controller.js");

router.use(authMiddleware);

// Exam Periods (Admin setup & oversight; teachers can read to attach papers)
router.get("/periods", authorizeRoles(["admin", "teacher", "master_admin"]), getExamPeriods);
router.post("/periods", authorizeRoles(["admin", "master_admin"]), createExamPeriod);
router.put("/periods/:id", authorizeRoles(["admin", "master_admin"]), updateExamPeriod);
router.delete("/periods/:id", authorizeRoles(["admin", "master_admin"]), deleteExamPeriod);

// Exams
router.post("/", authorizeRoles(["admin", "teacher"]), createExam);
router.get("/", authorizeRoles(["admin", "teacher", "student", "parent"]), getExams);
router.put("/:id", authorizeRoles(["admin", "teacher"]), updateExam);
router.delete("/:id", authorizeRoles(["admin", "teacher"]), deleteExam);

// Exam Results
router.post("/results", authorizeRoles(["admin", "teacher"]), recordExamResult);
router.get("/results", authorizeRoles(["admin", "teacher", "student", "parent"]), getExamResults);
router.get("/:examId/roster", authorizeRoles(["admin", "teacher"]), getExamRoster);
router.get("/:examId", authorizeRoles(["admin", "teacher", "student", "parent"]), getExamById);

module.exports = router;
