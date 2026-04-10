const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth.middleware.js");
const {
    updateMaterials,
    createAssignment,
    getAssignments,
    submitAssignment,
    gradeSubmission,
    createAnnouncement,
    getAnnouncements
} = require("../controllers/academic.controller.js");

const { authorizeRoles } = require("../middleware/authRole.js");

router.use(authMiddleware);

// Materials
router.put("/materials", authorizeRoles(["admin", "teacher"]), updateMaterials);

// Assignments
router.post("/assignments", authorizeRoles(["admin", "teacher"]), createAssignment);
router.get("/assignments", authorizeRoles(["admin", "teacher", "student"]), getAssignments);

// Submissions
router.post("/submissions", authorizeRoles(["student"]), submitAssignment);
router.put("/submissions/:id/grade", authorizeRoles(["admin", "teacher"]), gradeSubmission);

// Announcements
router.post("/announcements", authorizeRoles(["admin", "teacher"]), createAnnouncement);
router.get("/announcements", authorizeRoles(["admin", "teacher", "student", "parent"]), getAnnouncements);

module.exports = router;
