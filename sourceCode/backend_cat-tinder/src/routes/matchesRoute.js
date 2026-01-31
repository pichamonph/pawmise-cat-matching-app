const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getMatches,
  getMatchById,
  deleteMatch
} = require('../controllers/matchesController');

// All routes require authentication
router.use(protect);

// Get all matches for current owner
router.get('/', getMatches);

// Get match by ID
router.get('/:id', getMatchById);

// Delete/Unmatch
router.delete('/:id', deleteMatch);

module.exports = router;
