const mongoose = require('mongoose');

const swipeSchema = new mongoose.Schema({
  swiperOwnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Owner', required: true, index: true },
  swiperCatId: { type: mongoose.Schema.Types.ObjectId, ref: 'Cat', required: true, index: true },
  targetCatId: { type: mongoose.Schema.Types.ObjectId, ref: 'Cat', required: true, index: true },
  action: { type: String, enum: ['like', 'interested', 'pass'], required: true },
}, { timestamps: { createdAt: true, updatedAt: false } });

// ป้องกันปัดซ้ำคู่เดิม
swipeSchema.index({ swiperOwnerId: 1, swiperCatId: 1, targetCatId: 1 }, { unique: true });

// Index for finding who liked a specific cat
swipeSchema.index({ targetCatId: 1, action: 1 });

module.exports = mongoose.model('Swipe', swipeSchema);