const express = require('express');
const router = express.Router();
const trialController = require('../controllers/trial.controller');

router.post('/start', trialController.startTrial);

module.exports = router;
