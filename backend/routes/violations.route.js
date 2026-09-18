const express = require('express');
const router = express.Router();
const ViolationsController = require('../controllers/violations.controller');
const { authMiddleware } = require('../middleware/auth.middleware');
const { authorizeRoles } = require('../middleware/authRole');

router.use(authMiddleware);

// Record violation (admin, teacher)
router.post('/', authorizeRoles(['admin', 'master_admin', 'teacher']), ViolationsController.createViolation);

// Get violations for authenticated student
router.get('/my', ViolationsController.getMyViolations);

// Get violation summary PDF
router.get('/student/:studentId/summary-pdf', ViolationsController.getViolationSummaryPdf);
router.get('/:id/pdf', ViolationsController.getViolationSummaryPdf);

// Get student violations
router.get('/student/:studentId', ViolationsController.getStudentViolations);

// Resolve or expunge violation
router.patch('/:id/resolve', authorizeRoles(['admin', 'master_admin', 'teacher']), ViolationsController.resolveViolation);

module.exports = router;
