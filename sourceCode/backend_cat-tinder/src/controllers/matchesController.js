const Match = require('../models/Match');
const Message = require('../models/Message');
const Cat = require('../models/Cat');

/**
 * Get all matches for current owner
 * GET /api/matches
 */
const getMatches = async (req, res) => {
  try {
    const ownerId = req.user.id;
    const { limit = 50, skip = 0 } = req.query;

    // Find matches where owner is participant
    const matches = await Match.find({
      $or: [
        { ownerAId: ownerId },
        { ownerBId: ownerId }
      ]
    })
      .populate('catAId', 'name gender ageYears ageMonths breed photos')
      .populate('catBId', 'name gender ageYears ageMonths breed photos')
      .populate('ownerAId', 'displayName avatarUrl phone')
      .populate('ownerBId', 'displayName avatarUrl phone')
      .sort({ lastMessageAt: -1, createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await Match.countDocuments({
      $or: [
        { ownerAId: ownerId },
        { ownerBId: ownerId }
      ]
    });

    res.json({
      status: 'ok',
      data: {
        matches,
        pagination: {
          total,
          limit: parseInt(limit),
          skip: parseInt(skip),
          hasMore: total > parseInt(skip) + parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Get matches error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch matches',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get match by ID with details
 * GET /api/matches/:id
 */
const getMatchById = async (req, res) => {
  try {
    const ownerId = req.user.id;
    const { id } = req.params;

    const match = await Match.findOne({
      _id: id,
      $or: [
        { ownerAId: ownerId },
        { ownerBId: ownerId }
      ]
    })
      .populate('catAId', 'name gender ageYears ageMonths breed photos location')
      .populate('catBId', 'name gender ageYears ageMonths breed photos location')
      .populate('ownerAId', 'displayName avatarUrl phone location')
      .populate('ownerBId', 'displayName avatarUrl phone location');

    if (!match) {
      return res.status(404).json({
        status: 'error',
        message: 'Match not found or you do not have access to it'
      });
    }

    res.json({
      status: 'ok',
      data: match
    });

  } catch (error) {
    console.error('Get match by ID error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch match details',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Delete/Unmatch a match
 * DELETE /api/matches/:id
 */
const deleteMatch = async (req, res) => {
  try {
    const ownerId = req.user.id;
    const { id } = req.params;

    const match = await Match.findOne({
      _id: id,
      $or: [
        { ownerAId: ownerId },
        { ownerBId: ownerId }
      ]
    });

    if (!match) {
      return res.status(404).json({
        status: 'error',
        message: 'Match not found or you do not have access to it'
      });
    }

    // Delete all messages associated with this match
    await Message.deleteMany({ matchId: id });

    // Delete the match
    await Match.findByIdAndDelete(id);

    res.json({
      status: 'ok',
      message: 'Match deleted successfully'
    });

  } catch (error) {
    console.error('Delete match error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete match',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getMatches,
  getMatchById,
  deleteMatch
};
