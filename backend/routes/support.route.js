const express = require('express');
const router = express.Router();
const supportController = require('../controllers/support.controller.js');
const { authMiddleware } = require('../middleware/auth.middleware.js');

router.use(authMiddleware);

// Support tickets for users
router.get('/tickets', supportController.getMyTickets);
router.post('/tickets', supportController.createTicket);
router.get('/tickets/:id', supportController.getTicketDetails);
router.put('/tickets/:id', supportController.updateMyTicket);
router.delete('/tickets/:id', supportController.deleteMyTicket);
router.post('/tickets/:id/messages', supportController.addTicketMessage);

module.exports = router;
