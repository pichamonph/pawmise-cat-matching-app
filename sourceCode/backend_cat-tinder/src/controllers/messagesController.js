const Message = require('../models/Message');
const Match = require('../models/Match');

/**
 * Get messages for a specific match
 * GET /api/messages/:matchId
 */
const getMessagesByMatch = async (req, res) => {
  try {
    const { matchId } = req.params;
    const { limit = 50, before } = req.query;

    // Verify match exists and user is part of it
    const match = await Match.findById(matchId);
    if (!match) {
      return res.status(404).json({
        status: 'error',
        message: 'Match not found'
      });
    }

    // Check if current user is part of this match
    if (
      match.ownerAId.toString() !== req.user.id &&
      match.ownerBId.toString() !== req.user.id
    ) {
      return res.status(403).json({
        status: 'error',
        message: 'You are not authorized to view these messages'
      });
    }

    // Build query
    const query = { matchId };
    if (before) {
      query.sentAt = { $lt: new Date(before) };
    }

    // Fetch messages
    const messages = await Message.find(query)
      .sort({ sentAt: -1 })
      .limit(parseInt(limit))
      .populate('senderOwnerId', 'displayName avatarUrl');

    res.json({
      status: 'ok',
      data: messages.reverse() // Reverse to show oldest first
    });

  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch messages',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Send a message
 * POST /api/messages
 */
const sendMessage = async (req, res) => {
  try {
    const { matchId, text } = req.body;

    // Validate input
    if (!matchId || !text || !text.trim()) {
      return res.status(400).json({
        status: 'error',
        message: 'Match ID and message text are required'
      });
    }

    // Verify match exists and user is part of it
    const match = await Match.findById(matchId);
    if (!match) {
      return res.status(404).json({
        status: 'error',
        message: 'Match not found'
      });
    }

    // Check if current user is part of this match
    if (
      match.ownerAId.toString() !== req.user.id &&
      match.ownerBId.toString() !== req.user.id
    ) {
      return res.status(403).json({
        status: 'error',
        message: 'You are not authorized to send messages to this match'
      });
    }

    // Create message
    const newMessage = await Message.create({
      matchId,
      senderOwnerId: req.user.id,
      text: text.trim()
    });

    // Update match's lastMessage and lastMessageAt
    await Match.findByIdAndUpdate(matchId, {
      lastMessage: text.trim(),
      lastMessageAt: newMessage.sentAt
    });

    console.log('✅ Updated match lastMessage:', {
      matchId,
      lastMessage: text.trim(),
      lastMessageAt: newMessage.sentAt
    });

    // Populate sender info
    await newMessage.populate('senderOwnerId', 'displayName avatarUrl');

    res.status(201).json({
      status: 'ok',
      message: 'Message sent successfully',
      data: newMessage
    });

  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to send message',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Mark messages as read
 * PUT /api/messages/:matchId/read
 */
const markMessagesAsRead = async (req, res) => {
  try {
    const { matchId } = req.params;

    // Verify match exists and user is part of it
    const match = await Match.findById(matchId);
    if (!match) {
      return res.status(404).json({
        status: 'error',
        message: 'Match not found'
      });
    }

    // Check if current user is part of this match
    if (
      match.ownerAId.toString() !== req.user.id &&
      match.ownerBId.toString() !== req.user.id
    ) {
      return res.status(403).json({
        status: 'error',
        message: 'You are not authorized to update these messages'
      });
    }

    // Mark all unread messages from the other user as read
    const result = await Message.updateMany(
      {
        matchId,
        senderOwnerId: { $ne: req.user.id },
        read: false
      },
      {
        $set: { read: true }
      }
    );

    res.json({
      status: 'ok',
      message: 'Messages marked as read',
      data: { modifiedCount: result.modifiedCount }
    });

  } catch (error) {
    console.error('Mark messages as read error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to mark messages as read',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getMessagesByMatch,
  sendMessage,
  markMessagesAsRead
};
