const express = require("express");
const router = express.Router();
const {
    createClass,
    updateClass,
    deleteClass,
    getClasses,
    getClassOptions,
    getClassDomainCatalog,
    createClassDomainCategory,
    createClassDomainLevel,
    createClassDomainStream,
    archiveClassDomainCategory,
    archiveClassDomainLevel,
    archiveClassDomainStream,
    getClassStudents,
    enrollStudent,
    removeStudent,
    autoAssignStudents,
    requestStudentTransfer,
    getStudentTransfers,
    approveStudentTransfer,
    rejectStudentTransfer,
    setClassFinalLevel,
} = require("../controllers/class.controller.js");
const { authMiddleware } = require("../middleware/auth.middleware.js");
const { authorizeRoles } = require("../middleware/authRole.js");

// All routes require authentication
router.use(authMiddleware);

// Transfer routes (must be registered before /:id)
router.get("/transfers", authorizeRoles(["admin", "teacher", "master_admin"]), getStudentTransfers);
router.post("/transfers", authorizeRoles(["admin", "teacher", "master_admin"]), requestStudentTransfer);
router.patch("/transfers/:id/approve", authorizeRoles(["admin", "master_admin"]), approveStudentTransfer);
router.patch("/transfers/:id/reject", authorizeRoles(["admin", "master_admin"]), rejectStudentTransfer);

// GET routes: allow admin, master_admin, teacher
router.get("/", authorizeRoles(["admin", "teacher", "master_admin"]), getClasses);
router.get("/options", authorizeRoles(["admin", "teacher", "master_admin"]), getClassOptions);
router.get("/domain/catalog", authorizeRoles(["admin", "teacher", "master_admin"]), getClassDomainCatalog);
router.get("/:id/students", authorizeRoles(["admin", "teacher", "master_admin"]), getClassStudents);

// Mutation routes: allow admin & master_admin
router.post("/", authorizeRoles(["admin", "master_admin"]), createClass);
router.patch("/:id/final-level", authorizeRoles(["admin", "master_admin"]), setClassFinalLevel);
router.post("/domain/categories", authorizeRoles(["admin", "master_admin"]), createClassDomainCategory);
router.post("/domain/levels", authorizeRoles(["admin", "master_admin"]), createClassDomainLevel);
router.post("/domain/streams", authorizeRoles(["admin", "master_admin"]), createClassDomainStream);
router.post("/auto-assign", authorizeRoles(["admin", "master_admin"]), autoAssignStudents);
router.put("/:id", authorizeRoles(["admin", "master_admin"]), updateClass);
router.delete("/:id", authorizeRoles(["admin", "master_admin"]), deleteClass);
router.delete("/domain/categories/:id", authorizeRoles(["admin", "master_admin"]), archiveClassDomainCategory);
router.delete("/domain/levels/:id", authorizeRoles(["admin", "master_admin"]), archiveClassDomainLevel);
router.delete("/domain/streams/:id", authorizeRoles(["admin", "master_admin"]), archiveClassDomainStream);
router.post("/:id/enroll", authorizeRoles(["admin", "master_admin"]), enrollStudent);
router.delete("/:id/students/:studentId", authorizeRoles(["admin", "master_admin"]), removeStudent);

module.exports = router;
