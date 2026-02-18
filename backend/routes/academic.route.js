const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth.middleware");
const {
    updateMaterials,
    createAssignment,
    getAssignments,
    submitAssignment,
    gradeSubmission,
    createAnnouncement,
    getAnnouncements
} = require("../controllers/academic.controller");

// Materials
router.put("/materials", authMiddleware, updateMaterials);

// Assignments
router.post("/assignments", authMiddleware, createAssignment);
router.get("/assignments", authMiddleware, getAssignments);

// Submissions
router.post("/submissions", authMiddleware, submitAssignment);
router.put("/submissions/:id/grade", authMiddleware, gradeSubmission);

// Announcements
router.post("/announcements", authMiddleware, createAnnouncement);
router.get("/announcements", authMiddleware, getAnnouncements);

module.exports = router;
