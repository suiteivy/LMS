const express = require('express');
const router = express.Router();
const supportController = require('../controllers/support.controller');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// Support tickets for users
router.get('/tickets', supportController.getMyTickets);
router.post('/tickets', supportController.createTicket);
router.get('/tickets/:id', supportController.getTicketDetails);
router.post('/tickets/:id/messages', supportController.addTicketMessage);

module.exports = router;
