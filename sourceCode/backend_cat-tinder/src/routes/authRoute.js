const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { register, login, getCurrentUser, logout, deleteAccount } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { upload } = require('../utils/imageUpload');

// Email/Password Authentication
router.post(
  '/register',
  upload.single('avatar'), // Add avatar upload middleware
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('username').trim().isLength({ min: 3 }).matches(/^[a-zA-Z0-9_]+$/),
    body('location.province').optional({ checkFalsy: true }),
    body('location.lat').optional({ checkFalsy: true }).isFloat(),
    body('location.lng').optional({ checkFalsy: true }).isFloat()
  ],
  register
);

router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
  ],
  login
);

// Get current user
router.get('/me', protect, getCurrentUser);

// Logout user (no auth required - client-side logout)
router.post('/logout', logout);

// Delete account (requires authentication)
router.delete('/delete-account', protect, deleteAccount);

module.exports = router;
