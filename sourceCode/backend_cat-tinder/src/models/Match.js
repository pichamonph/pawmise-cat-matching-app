const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
  catAId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Cat', 
    required: true, 
    index: true },
  ownerAId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Owner', 
    required: true, 
    index: true },
  catBId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Cat', 
    required: true, 
    index: true },
  ownerBId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Owner', 
    required: true, 
    index: true },
  lastMessageAt: { 
    type: Date, 
    default: null, 
    index: true },
}, { timestamps: { 
  createdAt: true, 
  updatedAt: false } });

// กันสร้าง match ซ้ำ (ไม่สนลำดับ A/B)
matchSchema.index(
  { catAId: 1, catBId: 1 },
  { unique: true, partialFilterExpression: { catAId: { $exists: true }, catBId: { $exists: true } } }
);

// Index for querying matches by owner
matchSchema.index({ ownerAId: 1, lastMessageAt: -1 });
matchSchema.index({ ownerBId: 1, lastMessageAt: -1 });

module.exports = mongoose.model('Match', matchSchema);