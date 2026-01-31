const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getMessagesByMatch,
  sendMessage,
  markMessagesAsRead
} = require('../controllers/messagesController');

// Get messages for a specific match
router.get('/:matchId', protect, getMessagesByMatch);

// Send a message
router.post('/', protect, sendMessage);

// Mark messages as read
router.put('/:matchId/read', protect, markMessagesAsRead);

module.exports = router;
