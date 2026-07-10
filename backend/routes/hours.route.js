const express = require('express');
const { authMiddleware } = require('../middleware/auth.middleware.js');
const { authorizeRoles } = require('../middleware/authRole.js');
const {
  recomputeInstitutionDailyHours,
  getMyHours,
  getTeacherHours,
  getStudentHours,
} = require('../controllers/hours.controller.js');

const router = express.Router();

router.use(authMiddleware);

router.post(
  '/recompute',
  authorizeRoles(['admin', 'school_admin', 'platform_admin', 'bursary', 'master_admin']),
  recomputeInstitutionDailyHours
);

router.get('/me', authorizeRoles(['teacher', 'student']), getMyHours);

router.get(
  '/teachers/:teacherId',
  authorizeRoles(['admin', 'school_admin', 'platform_admin', 'bursary', 'master_admin', 'teacher']),
  getTeacherHours
);

router.get(
  '/students/:studentId',
  authorizeRoles(['admin', 'school_admin', 'platform_admin', 'bursary', 'master_admin', 'student', 'parent']),
  getStudentHours
);

module.exports = router;
