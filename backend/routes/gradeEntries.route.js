const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth.middleware.js");
const { authorizeRoles } = require("../middleware/authRole.js");
const {
    getGradeEntries,
    createGradeEntry,
    updateGradeEntry,
    deleteGradeEntry,
    bulkCreateGradeEntries,
    bulkImportGrades,
    syncAssignmentGrades,
    syncExamGrades,
    getGradeSummary,
    getStudentGradingScale,
    getPerformanceTrends,
} = require("../controllers/gradeEntries.controller.js");

router.use(authMiddleware);

router.get("/", authorizeRoles(["admin", "teacher", "student", "parent"]), getGradeEntries);
router.get("/summary", authorizeRoles(["admin", "teacher"]), getGradeSummary);
router.get("/performance-trends", authorizeRoles(["admin", "teacher", "student", "parent"]), getPerformanceTrends);
router.get("/student-scale", authorizeRoles(["admin", "teacher", "student", "parent"]), getStudentGradingScale);
router.post("/", authorizeRoles(["admin", "teacher"]), createGradeEntry);
router.put("/:id", authorizeRoles(["admin", "teacher"]), updateGradeEntry);
router.delete("/:id", authorizeRoles(["admin"]), deleteGradeEntry);
router.post("/bulk", authorizeRoles(["admin", "teacher"]), bulkCreateGradeEntries);
router.post("/import", authorizeRoles(["admin", "teacher"]), bulkImportGrades);
router.post("/sync/assignments", authorizeRoles(["admin", "teacher"]), syncAssignmentGrades);
router.post("/sync/exams", authorizeRoles(["admin", "teacher"]), syncExamGrades);

module.exports = router;
