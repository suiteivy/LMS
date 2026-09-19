const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware.js');
const transcriptsController = require('../controllers/transcripts.controller.js');

router.use(authMiddleware);

// Configuration routes
router.get('/configurations', transcriptsController.getConfigurations);
router.put('/configurations/:classification', transcriptsController.updateConfiguration);

// Periods discovery
router.get('/periods', transcriptsController.getAvailablePeriods);

// Transcript data and compilation
router.get('/data', transcriptsController.getTranscriptData);
router.post('/compile-pdf', transcriptsController.compileTranscriptPdf);
router.post('/compile-base64', transcriptsController.compileTranscriptPdfBase64);

module.exports = router;
