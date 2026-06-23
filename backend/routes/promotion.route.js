const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware.js');
const { authorizeRoles } = require('../middleware/authRole.js');
const {
  getPromotionCycles,
  createPromotionCycle,
  getCycleDecisions,
  previewPromotionCycle,
  executePromotionCycle,
} = require('../controllers/promotion.controller.js');

router.use(authMiddleware);

router.get('/cycles', authorizeRoles(['admin', 'master_admin', 'teacher']), getPromotionCycles);
router.post('/cycles', authorizeRoles(['admin', 'master_admin']), createPromotionCycle);
router.get('/cycles/:id/decisions', authorizeRoles(['admin', 'master_admin', 'teacher']), getCycleDecisions);
router.post('/cycles/:id/preview', authorizeRoles(['admin', 'master_admin']), previewPromotionCycle);
router.post('/cycles/:id/execute', authorizeRoles(['admin', 'master_admin']), executePromotionCycle);

module.exports = router;
