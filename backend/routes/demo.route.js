const express = require('express');
const router = express.Router();
const demoController = require('../controllers/demo.controller.js');

router.get('/', (req, res) => {
    res.status(200).json({ message: 'Demo service is active.' });
});
router.get('/start', (req, res) => {
    res.status(200).json({ message: 'Demo endpoint ready. Send POST /api/demo/start with { role } to start a demo session.' });
});
router.post('/start', demoController.startDemo);
router.post('/end', demoController.endDemo);

// Feedback endpoints (Section 2)
router.post('/feedback', demoController.submitFeedback);
router.get('/feedback', demoController.getFeedback);
router.patch('/feedback/:id', demoController.updateFeedbackStatus);

module.exports = router;

