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

module.exports = router;

