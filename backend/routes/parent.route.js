const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth.middleware.js");
const { authorizeRoles } = require("../middleware/authRole.js");
const {
    getLinkedStudents,
    getStudentAcademicData,
    getStudentAttendance,
    getStudentFinance,
    getStudentBursaries
} = require("../controllers/parent.controller.js");

// All parent routes require 'parent' role (or admin)
router.use(authMiddleware);
router.use(authorizeRoles(['parent', 'admin']));

router.get("/students", getLinkedStudents);
router.get("/student/:studentId/performance", getStudentAcademicData);
router.get("/student/:studentId/attendance", getStudentAttendance);
router.get("/student/:studentId/finance", getStudentFinance);
router.get("/student/:studentId/bursaries", getStudentBursaries);

module.exports = router;

