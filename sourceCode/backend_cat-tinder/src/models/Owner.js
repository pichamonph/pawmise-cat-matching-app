const mongoose = require('mongoose');

const ownerSchema = new mongoose.Schema({
  // Authentication
  email: { type: String, unique: true, required: true, index: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },

  // Profile information
  username: { type: String, required: true, unique: true, index: true, trim: true },
  phone: { type: String },
  avatar: {
    url: { type: String, required: true },
    publicId: String
  },

  // Location for matching
  location: {
    province: { type: String, default: '' },
    district: String,
    lat: { type: Number, default: 0 },
    lng: { type: Number, default: 0 }
  },

  // Onboarding status
  onboardingCompleted: { type: Boolean, default: false },

  // Account status
  active: { type: Boolean, default: true },

  // Daily interest usage tracking
  interestUsage: {
    date: { type: Date },
    count: { type: Number, default: 0 }
  }
}, { timestamps: true });

// Index for geospatial queries
ownerSchema.index({ 'location.lat': 1, 'location.lng': 1 });

module.exports = mongoose.model('Owner', ownerSchema);
