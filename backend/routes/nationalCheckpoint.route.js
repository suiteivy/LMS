// routes/nationalCheckpoint.route.js
const express = require('express');
const router = express.Router();
const checkpointController = require('../controllers/nationalCheckpoint.controller');
const { authMiddleware } = require('../middleware/auth.middleware.js');

router.use(authMiddleware);

router.get('/available', checkpointController.getAvailableCheckpoints);
router.get('/student/:studentId', checkpointController.getStudentCheckpoints);
router.post('/', checkpointController.recordCheckpoint);
router.delete('/:id', checkpointController.deleteCheckpoint);

module.exports = router;
