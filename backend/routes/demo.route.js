const express = require('express');
const router = express.Router();
const demoController = require('../controllers/demo.controller.js');

router.post('/start', demoController.startDemo);

module.exports = router;
