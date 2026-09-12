const express = require("express");
const router = express.Router();

const { authMiddleware } = require("../middleware/auth.middleware.js");
const {
  enrollStudentInSubject,
  getSubjects,
  getSubjectById,
  createSubject,
  updateSubject,
  getFilteredSubjects,
  getSubjectsByClass,
  updateProgress,
  deleteSubject,
} = require("../controllers/subject.controller.js");
const curriculumController = require("../controllers/curriculumContent.controller.js");

const { authorizeRoles } = require("../middleware/authRole.js");

router.use(authMiddleware);

// Create a new subject
router.post("/", authorizeRoles(["admin", "master_admin", "teacher"]), createSubject);

// Get all subjects for an institution
router.get("/", authorizeRoles(["admin", "teacher"]), getSubjects);

// Get subjects filtered by user role and ID
router.get("/filtered", authorizeRoles(["admin", "teacher", "student", "parent"]), getFilteredSubjects);

// Get subjects by class ID
router.get("/class/:classId", authorizeRoles(["admin", "teacher", "student", "parent"]), getSubjectsByClass);

// Two-Level Subject Content: Topic Areas (Plain Label)
router.get("/:subjectId/topic-areas", authorizeRoles(["admin", "teacher", "student", "parent"]), curriculumController.getTopicAreas);
router.post("/:subjectId/topic-areas", authorizeRoles(["admin", "master_admin", "teacher"]), curriculumController.createTopicArea);
router.put("/topic-areas/:id", authorizeRoles(["admin", "master_admin", "teacher"]), curriculumController.updateTopicArea);
router.delete("/topic-areas/:id", authorizeRoles(["admin", "master_admin"]), curriculumController.deleteTopicArea);

// Two-Level Subject Content: Topics (Plain Label)
router.get("/topic-areas/:topicAreaId/topics", authorizeRoles(["admin", "teacher", "student", "parent"]), curriculumController.getTopics);
router.post("/topic-areas/:topicAreaId/topics", authorizeRoles(["admin", "master_admin", "teacher"]), curriculumController.createTopic);
router.put("/topics/:id", authorizeRoles(["admin", "master_admin", "teacher"]), curriculumController.updateTopic);
router.delete("/topics/:id", authorizeRoles(["admin", "master_admin"]), curriculumController.deleteTopic);

// Get subject by ID
router.get("/:id", authorizeRoles(["admin", "teacher", "student", "parent"]), getSubjectById);

// Enroll in a subject
router.post("/enroll", authorizeRoles(["admin", "teacher", "student"]), enrollStudentInSubject);

// Update subject progress
router.patch("/:id/progress", authorizeRoles(["admin", "teacher"]), updateProgress);

// Update subject details
router.put("/:id", authorizeRoles(["admin", "master_admin", "teacher"]), updateSubject);

// Delete subject
router.delete("/:id", authorizeRoles(["admin", "master_admin"]), deleteSubject);

module.exports = router;
