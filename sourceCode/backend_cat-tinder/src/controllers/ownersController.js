const Owner = require('../models/Owner');
const { uploadToCloudinary, deleteImage } = require('../utils/imageUpload');

/**
 * Get owner profile
 * GET /api/owners/profile
 */
const getProfile = async (req, res) => {
  try {
    const owner = await Owner.findById(req.user.id).select('-passwordHash');

    if (!owner) {
      return res.status(404).json({
        status: 'error',
        message: 'Owner not found'
      });
    }

    res.status(200).json({
      status: 'ok',
      data: owner
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update owner profile
 * PUT /api/owners/profile
 */
const updateProfile = async (req, res) => {
  try {
    const { username, phone, location } = req.body;

    // Get current owner first
    const owner = await Owner.findById(req.user.id);
    if (!owner) {
      return res.status(404).json({
        status: 'error',
        message: 'Owner not found'
      });
    }

    const updateData = {};
    if (username) {
      // Check if username is already taken by another user
      const existingOwner = await Owner.findOne({
        username,
        _id: { $ne: req.user.id }
      });
      if (existingOwner) {
        return res.status(400).json({
          status: 'error',
          message: 'Username already taken'
        });
      }
      updateData.username = username;
    }
    if (phone) updateData.phone = phone;
    if (location) updateData.location = location;

    // Handle avatar update if new file uploaded
    if (req.file) {
      // Delete old avatar if exists
      if (owner.avatar && owner.avatar.publicId) {
        await deleteImage(owner.avatar.publicId);
      }

      // Upload new avatar to Cloudinary
      const avatarUploadResult = await uploadToCloudinary(req.file.buffer, 'pawmise/avatars');
      updateData.avatar = {
        url: avatarUploadResult.secure_url,
        publicId: avatarUploadResult.public_id
      };
    }

    const updatedOwner = await Owner.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-passwordHash');

    res.status(200).json({
      status: 'ok',
      message: 'Profile updated successfully',
      data: updatedOwner
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Complete onboarding
 * PUT /api/owners/onboarding
 */
const completeOnboarding = async (req, res) => {
  try {
    const { username, phone, location } = req.body;

    // Validate required fields for onboarding
    if (!username || !location || !location.province || !location.lat || !location.lng) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields for onboarding'
      });
    }

    // Check if username is already taken
    const existingOwner = await Owner.findOne({
      username,
      _id: { $ne: req.user.id }
    });
    if (existingOwner) {
      return res.status(400).json({
        status: 'error',
        message: 'Username already taken'
      });
    }

    const owner = await Owner.findByIdAndUpdate(
      req.user.id,
      {
        username,
        phone,
        location,
        onboardingCompleted: true
      },
      { new: true, runValidators: true }
    ).select('-passwordHash');

    if (!owner) {
      return res.status(404).json({
        status: 'error',
        message: 'Owner not found'
      });
    }

    res.status(200).json({
      status: 'ok',
      message: 'Onboarding completed successfully',
      data: owner
    });

  } catch (error) {
    console.error('Complete onboarding error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Upload avatar
 * POST /api/owners/avatar
 */
const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'No file uploaded'
      });
    }

    // Get current owner
    const owner = await Owner.findById(req.user.id);
    if (!owner) {
      return res.status(404).json({
        status: 'error',
        message: 'Owner not found'
      });
    }

    // Delete old avatar if exists
    if (owner.avatar && owner.avatar.publicId) {
      await deleteImage(owner.avatar.publicId);
    }

    // Upload new avatar to Cloudinary
    const result = await uploadToCloudinary(req.file.buffer, 'pawmise/avatars');

    // Update owner with new avatar
    owner.avatar = {
      url: result.secure_url,
      publicId: result.public_id
    };
    await owner.save();

    res.status(200).json({
      status: 'ok',
      message: 'Avatar uploaded successfully',
      data: {
        avatar: owner.avatar
      }
    });

  } catch (error) {
    console.error('Upload avatar error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error during upload',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  completeOnboarding,
  uploadAvatar
};
