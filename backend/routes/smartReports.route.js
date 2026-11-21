const express = require('express');
const router = express.Router();
const smartReportsController = require('../controllers/smartReports.controller.js');
const { authMiddleware } = require('../middleware/auth.middleware.js');
const { authorizeRoles } = require('../middleware/authRole.js');

router.use(authMiddleware);

// Catalog discovery (scoped by section and role)
router.get('/catalog', authorizeRoles(['admin', 'teacher', 'master_admin']), smartReportsController.getCatalog);

// Preview and Count (fast query capped at 50 rows)
router.post('/preview', authorizeRoles(['admin', 'teacher', 'master_admin']), smartReportsController.previewReport);

// Generate report PDF
router.post('/generate', authorizeRoles(['admin', 'teacher', 'master_admin']), smartReportsController.generateReport);

// Cumulative Records Dossier
router.post('/dossier', authorizeRoles(['admin', 'master_admin']), smartReportsController.generateDossier);

// Saved Reports Management
router.get('/saved', authorizeRoles(['admin', 'teacher', 'master_admin']), smartReportsController.getSavedReports);
router.post('/saved', authorizeRoles(['admin', 'teacher', 'master_admin']), smartReportsController.createSavedReport);
router.delete('/saved/:id', authorizeRoles(['admin', 'teacher', 'master_admin']), smartReportsController.deleteSavedReport);

module.exports = router;
