const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  matchId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Match', 
    required: true, 
    index: true },
  senderOwnerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Owner', 
    required: true, 
    index: true },
  text: { 
    type: String, 
    required: true },
  read: { 
    type: Boolean, 
    default: false, 
    index: true }
}, { timestamps: { createdAt: 'sentAt', updatedAt: false } });

// เร่งการดึงแชท: match + เวลาส่ง
messageSchema.index({ matchId: 1, sentAt: -1 });

module.exports = mongoose.model('Message', messageSchema);