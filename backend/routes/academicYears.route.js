const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth.middleware.js");
const { authorizeRoles } = require("../middleware/authRole.js");
const {
    getAcademicYears,
    createAcademicYear,
    updateAcademicYear,
    deleteAcademicYear,
    getTerms,
    getActiveTerm,
    createTerm,
    updateTerm,
    deleteTerm,
    setCurrentTerm,
    setTermLockState
} = require("../controllers/academicYears.controller.js");

router.use(authMiddleware);

// Active Term Resolution (date-driven)
router.get("/active-term", authorizeRoles(["admin", "teacher", "student", "parent"]), getActiveTerm);

// Academic Years
router.get("/years", authorizeRoles(["admin", "teacher", "student", "parent"]), getAcademicYears);
router.post("/years", authorizeRoles(["admin"]), createAcademicYear);
router.put("/years/:id", authorizeRoles(["admin"]), updateAcademicYear);
router.delete("/years/:id", authorizeRoles(["admin"]), deleteAcademicYear);

// Terms
router.get("/terms", authorizeRoles(["admin", "teacher", "student", "parent"]), getTerms);
router.post("/terms", authorizeRoles(["admin"]), createTerm);
router.put("/terms/:id", authorizeRoles(["admin"]), updateTerm);
router.delete("/terms/:id", authorizeRoles(["admin"]), deleteTerm);
router.put("/terms/set-current", authorizeRoles(["admin"]), setCurrentTerm);
router.put("/terms/:id/lock", authorizeRoles(["admin"]), setTermLockState);

module.exports = router;
