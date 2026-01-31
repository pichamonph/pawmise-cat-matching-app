const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { upload } = require('../utils/imageUpload');
const {
  getCatFeed,
  getMyCats,
  getCatById,
  createCat,
  updateCat,
  deleteCat
} = require('../controllers/catsController');

// All routes require authentication
router.use(protect);

// Get cat feed for swiping
router.get('/feed', getCatFeed);

// Get my cats
router.get('/my-cats', getMyCats);

// Get cat by ID
router.get('/:id', getCatById);

// Create new cat (with photo upload)
router.post('/', upload.array('photos', 5), createCat);

// Update cat
router.put('/:id', upload.array('photos', 5), updateCat);

// Delete cat
router.delete('/:id', deleteCat);

// ✅ Debug endpoint - สำหรับตรวจสอบข้อมูลในระบบ
router.get('/debug/stats', async (req, res) => {
  try {
    const ownerId = req.user.id;
    const Owner = require('../models/Owner');
    const { getMatchingMode } = require('../utils/geolocation');

    // Get owner info
    const owner = await Owner.findById(ownerId);

    // Get stats
    const stats = {
      totalCats: await Cat.countDocuments(),
      activeCats: await Cat.countDocuments({ active: true }),
      myCats: await Cat.countDocuments({ ownerId }),
      myActiveCats: await Cat.countDocuments({ ownerId, active: true }),
      maleCats: await Cat.countDocuments({ active: true, gender: 'male' }),
      femaleCats: await Cat.countDocuments({ active: true, gender: 'female' }),
      catsWithGPS: await Cat.countDocuments({
        active: true,
        'location.lat': { $exists: true },
        'location.lng': { $exists: true }
      }),
      catsWithProvince: await Cat.countDocuments({
        active: true,
        'location.province': { $exists: true }
      }),
      readyForBreeding: await Cat.countDocuments({ active: true, readyForBreeding: true })
    };

    // Get sample cats
    const sampleCats = await Cat.find({ active: true })
      .limit(5)
      .select('name gender location ownerId readyForBreeding')
      .populate('ownerId', 'username location');

    // Get owner's matching mode
    const matchingMode = getMatchingMode(owner);

    res.json({
      status: 'ok',
      data: {
        stats,
        sampleCats,
        userId: ownerId,
        ownerLocation: owner?.location,
        matchingMode,
        systemInfo: {
          modes: ['strict', 'flexible', 'province', 'unlimited'],
          currentMode: matchingMode,
          hasGPS: !!(owner?.location?.lat && owner?.location?.lng),
          hasProvince: !!owner?.location?.province
        }
      }
    });
  } catch (error) {
    console.error('❌ Debug stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
