const express = require('express');
const router = express.Router();
const reportsController = require('../controllers/reports.controller.js');

// All routes are protected via server.js middleware
router.get('/', reportsController.getReports);
router.get('/:id', reportsController.getReportById);
router.post('/', reportsController.createReport);
router.patch('/:id', reportsController.updateReport);
router.delete('/:id', reportsController.deleteReport);

module.exports = router;
