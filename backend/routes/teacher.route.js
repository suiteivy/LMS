const express = require("express");
const router = express.Router();
const {
    getDashboardStats,
    getAnalytics,
    getStudentPerformance,
    getStudentDetails,
    getSubjectClasses,
    listClassStudents,
    getMyProfile,
    requestNameChange,
    getStudentRankings,
    getHODSubjects,
    getCoveragePlans,
    createCoveragePlan,
    updateCoveragePlan,
    deleteCoveragePlan,
    getRecordOfWork,
    createRecordOfWork,
    updateRecordOfWork,
    deleteRecordOfWork,
    detectLessonDateInfo
} = require("../controllers/teacher.controller.js");
const { authMiddleware } = require("../middleware/auth.middleware.js");
const { authorizeRoles } = require("../middleware/authRole.js");

router.use(authMiddleware);
router.use(authorizeRoles(["teacher", "admin"]));

router.get("/dashboard/stats", getDashboardStats);
router.get("/analytics", getAnalytics);
router.get("/profile", getMyProfile);
router.post("/profile/request-name-change", requestNameChange);
router.get("/subject-classes", getSubjectClasses);
router.get("/list-students", listClassStudents);
router.get("/students/performance", getStudentPerformance);
router.get("/students/:studentId/details", getStudentDetails);
router.get("/rankings", getStudentRankings);

// Coverage Plans (J1)
router.get("/hod-subjects", getHODSubjects);
router.get("/coverage-plans", getCoveragePlans);
router.post("/coverage-plans", createCoveragePlan);
router.put("/coverage-plans/:id", updateCoveragePlan);
router.delete("/coverage-plans/:id", deleteCoveragePlan);

// Record of Work (J2)
router.get("/record-of-work/detect-date", detectLessonDateInfo);
router.get("/record-of-work", getRecordOfWork);
router.post("/record-of-work", createRecordOfWork);
router.put("/record-of-work/:id", updateRecordOfWork);
router.delete("/record-of-work/:id", deleteRecordOfWork);

module.exports = router;
