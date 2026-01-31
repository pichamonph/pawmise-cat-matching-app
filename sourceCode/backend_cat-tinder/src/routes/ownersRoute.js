const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { upload } = require('../utils/imageUpload');
const {
  updateProfile,
  completeOnboarding,
  getProfile,
  uploadAvatar
} = require('../controllers/ownersController');

// All routes require authentication
router.use(protect);

// Get owner profile
router.get('/profile', getProfile);

// Update owner profile
router.put('/profile', upload.single('avatar'), updateProfile);

// Upload avatar
router.post('/avatar', upload.single('avatar'), uploadAvatar);

// Complete onboarding
router.post('/onboarding', completeOnboarding);

module.exports = router;
