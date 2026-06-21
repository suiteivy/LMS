const express = require('express');
const router = express.Router();
const reportsController = require('../controllers/reports.controller.js');
const { authMiddleware } = require('../middleware/auth.middleware.js');
const { authorizeRoles } = require('../middleware/authRole.js');

// All routes require authentication
router.use(authMiddleware);

// GET routes: all roles (restricted internally for student/parent)
router.get('/', authorizeRoles(['admin', 'teacher', 'student', 'parent', 'master_admin']), reportsController.getReports);
router.get('/:id', authorizeRoles(['admin', 'teacher', 'student', 'parent', 'master_admin']), reportsController.getReportById);

// Mutation routes: admin and teacher only
router.post('/', authorizeRoles(['admin', 'teacher', 'master_admin']), reportsController.createReport);
router.patch('/:id', authorizeRoles(['admin', 'teacher', 'master_admin']), reportsController.updateReport);
router.delete('/:id', authorizeRoles(['admin', 'teacher', 'master_admin']), reportsController.deleteReport);

module.exports = router;
