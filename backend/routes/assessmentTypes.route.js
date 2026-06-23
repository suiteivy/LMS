const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth.middleware.js");
const { authorizeRoles } = require("../middleware/authRole.js");
const {
    getAssessmentTypes,
    createAssessmentTypes,
    updateAssessmentType,
    deleteAssessmentType,
    reorderAssessmentTypes
} = require("../controllers/assessmentTypes.controller.js");

router.use(authMiddleware);

router.get("/", authorizeRoles(["admin", "teacher", "student", "parent"]), getAssessmentTypes);
router.post("/", authorizeRoles(["admin", "teacher"]), createAssessmentTypes);
router.put("/:id", authorizeRoles(["admin", "teacher"]), updateAssessmentType);
router.delete("/:id", authorizeRoles(["admin", "teacher"]), deleteAssessmentType);
router.put("/reorder", authorizeRoles(["admin", "teacher"]), reorderAssessmentTypes);

module.exports = router;
