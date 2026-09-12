// routes/track.route.js
const express = require('express');
const router = express.Router();
const trackController = require('../controllers/track.controller');
const { authMiddleware } = require('../middleware/auth.middleware.js');

router.use(authMiddleware);

// Track management
router.get('/', trackController.getTracks);
router.post('/', trackController.createTrack);
router.put('/:id', trackController.updateTrack);

// Subject assignments
router.post('/:id/subjects', trackController.assignSubjectToTrack);
router.delete('/:id/subjects/:subjectId', trackController.removeSubjectFromTrack);

// Student track enrollment
router.post('/enroll', trackController.enrollStudentInTrack);
router.get('/student/:studentId', trackController.getStudentTrack);

module.exports = router;
