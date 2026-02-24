const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth.middleware");
const { authorizeRoles } = require("../middleware/authRole");
const {
    getLinkedStudents,
    getStudentAcademicData,
    getStudentAttendance,
    getStudentFinance
} = require("../controllers/parent.controller");

// All parent routes require 'parent' role (or admin)
router.use(authMiddleware);
router.use(authorizeRoles(['parent', 'admin']));

router.get("/students", getLinkedStudents);
router.get("/student/:studentId/performance", getStudentAcademicData);
router.get("/student/:studentId/attendance", getStudentAttendance);
router.get("/student/:studentId/finance", getStudentFinance);

module.exports = router;
