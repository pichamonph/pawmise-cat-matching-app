const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  createSwipe,
  getLikesSent,
  getLikesReceived,
  getInterestStatus,
  resetInterestUsage,
  resetAllInterestUsage
} = require('../controllers/swipesController');

// All routes require authentication
router.use(protect);

// Create a swipe (like or pass)
router.post('/', createSwipe);

// Get likes sent by a specific cat
router.get('/likes-sent/:catId', getLikesSent);

// Get likes received by a specific cat
router.get('/likes-received/:catId', getLikesReceived);

// Get daily interest status for a specific cat
router.get('/interest-status/:catId', getInterestStatus);

// Reset daily interest usage for a specific cat (for debugging)
router.delete('/interest-status/:catId', resetInterestUsage);

// Reset daily interest usage for all cats of an owner (for debugging)
router.delete('/interest-status-all', resetAllInterestUsage);

module.exports = router;
