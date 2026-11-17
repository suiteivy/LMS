const express = require('express');
const router = express.Router();
const reportsController = require('../controllers/reports.controller.js');
const performanceReportsController = require('../controllers/performanceReports.controller.js');
const { authMiddleware } = require('../middleware/auth.middleware.js');
const { authorizeRoles } = require('../middleware/authRole.js');

// All routes require authentication
router.use(authMiddleware);

// Performance summary & analytics reports
router.get('/performance/summary', authorizeRoles(['admin', 'teacher', 'student', 'parent', 'master_admin']), performanceReportsController.getSummary);
router.get('/performance/pdf', authorizeRoles(['admin', 'teacher', 'master_admin']), performanceReportsController.downloadReportPdf);
router.get('/rankings/summary', authorizeRoles(['admin', 'teacher', 'student', 'parent', 'master_admin']), performanceReportsController.getRankings);

// GET routes: all roles (restricted internally for student/parent)
router.get('/', authorizeRoles(['admin', 'teacher', 'student', 'parent', 'master_admin']), reportsController.getReports);
router.get('/rankings', authorizeRoles(['admin', 'teacher', 'master_admin']), require('../controllers/teacher.controller.js').getStudentRankings);
router.get('/:id', authorizeRoles(['admin', 'teacher', 'student', 'parent', 'master_admin']), reportsController.getReportById);

// Mutation routes: admin and teacher only
router.post('/', authorizeRoles(['admin', 'teacher', 'master_admin']), reportsController.createReport);
router.patch('/:id', authorizeRoles(['admin', 'teacher', 'master_admin']), reportsController.updateReport);
router.delete('/:id', authorizeRoles(['admin', 'teacher', 'master_admin']), reportsController.deleteReport);

module.exports = router;
