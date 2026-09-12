const express = require("express");
const router = express.Router();

const { authMiddleware } = require("../middleware/auth.middleware.js");
const { authorizeRoles } = require("../middleware/authRole.js");
const assessmentController = require("../controllers/evidenceAssessment.controller.js");

router.use(authMiddleware);

// Record single evidence entry (observation, project, task)
router.post(
  "/entries",
  authorizeRoles(["admin", "master_admin", "teacher"]),
  assessmentController.recordEvidenceEntry
);

// Bulk record evidence entries for multiple learners
router.post(
  "/entries/bulk",
  authorizeRoles(["admin", "master_admin", "teacher"]),
  assessmentController.bulkRecordEvidenceEntries
);

// Get a learner's topic area assessments and rollup for a subject
router.get(
  "/student/:studentId/subject/:subjectId",
  authorizeRoles(["admin", "teacher", "student", "parent"]),
  assessmentController.getStudentSubjectTopicAssessments
);

module.exports = router;
