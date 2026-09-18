const express = require('express');
const router = express.Router();
const MasterRecordController = require('../controllers/masterRecord.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

router.use(authMiddleware);

// Master Record view
router.get('/:id/master-record', MasterRecordController.getMasterRecord);

// Institutional Summary PDF
router.get('/:id/institutional-summary-pdf', MasterRecordController.getInstitutionalSummaryPdf);

module.exports = router;
