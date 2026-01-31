const mongoose = require('mongoose');

const catSchema = new mongoose.Schema({
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Owner', required: true, index: true },

  name: { type: String, required: true, trim: true },
  gender: { type: String, enum: ['male', 'female'], required: true, index: true },
  ageYears: { type: Number, min: 0, default: 0 },
  ageMonths: { type: Number, min: 0, max: 11, default: 0 },
  breed: { type: String, required: true },
  color: String,

  traits: [{
    type: String,
    enum: ['playful', 'calm', 'friendly', 'shy', 'affectionate', 'independent', 'vocal', 'quiet']
  }],

  photos: [{
    url: { type: String, required: true },
    publicId: String
  }],

  readyForBreeding: { type: Boolean, default: true },

  vaccinated: { type: Boolean, default: false },
  neutered: { type: Boolean, default: false },

  notes: String,

  location: {
    province: { type: String, default: '' },
    district: String,
    lat: { type: Number, default: 0 },
    lng: { type: Number, default: 0 }
  },

  active: { type: Boolean, default: true, index: true },

  // Interest usage tracking per cat
  interestUsage: {
    date: { type: Date, default: null },
    count: { type: Number, default: 0 }
  },
}, { timestamps: true });

// Indexes for efficient querying
catSchema.index({ active: 1, gender: 1, readyForBreeding: 1, createdAt: -1 });
catSchema.index({ 'location.lat': 1, 'location.lng': 1 });
catSchema.index({ ownerId: 1, active: 1 });

module.exports = mongoose.model('Cat', catSchema);