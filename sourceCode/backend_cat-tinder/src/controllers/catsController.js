const Cat = require('../models/Cat');
const Owner = require('../models/Owner');
const Swipe = require('../models/Swipe');
const Match = require('../models/Match');
const { uploadToCloudinary, deleteImages } = require('../utils/imageUpload');
const { calculateDistance, canCatsMatch, getMatchingMode } = require('../utils/geolocation');

/**
 * Get cat feed for swiping
 * GET /api/cats/feed
 */
const getCatFeed = async (req, res) => {
  try {
    const ownerId = req.user.id;
    const { catId, limit = 20 } = req.query;

    // Get the cat that will be swiping
    let myCat;
    if (catId) {
      myCat = await Cat.findOne({ _id: catId, ownerId, active: true });
    } else {
      // Get first active cat if no catId provided
      myCat = await Cat.findOne({ ownerId, active: true });
    }

    if (!myCat) {
      return res.status(404).json({
        status: 'error',
        message: 'You need to add a cat first'
      });
    }

    // Get owner for location and preferences
    const owner = await Owner.findById(ownerId);
    if (!owner) {
      return res.status(404).json({
        status: 'error',
        message: 'Owner not found'
      });
    }

    // Determine matching mode
    const matchingMode = getMatchingMode(owner, { defaultMode: 'flexible' });
    const maxDistance = owner.preferences?.maxDistance || 100; // Default 100km

    console.log(`🎯 Matching mode: ${matchingMode}, Max distance: ${maxDistance}km`);

    // Find cats that this cat has already swiped on
    const swipedCatIds = await Swipe.find({
      swiperCatId: myCat._id
    }).distinct('targetCatId');

    console.log(`🚫 Excluding ${swipedCatIds.length} previously swiped cats:`, swipedCatIds);

    // Find cats that this cat has already matched with
    const matchedCats = await Match.find({
      $or: [
        { catAId: myCat._id },
        { catBId: myCat._id }
      ]
    });

    // Extract the other cat IDs from matches
    const matchedCatIds = matchedCats.map(match => {
      return match.catAId.toString() === myCat._id.toString()
        ? match.catBId
        : match.catAId;
    });

    console.log(`💕 Excluding ${matchedCatIds.length} already matched cats:`, matchedCatIds);

    // Get all my cat IDs to exclude
    const myCatIds = await Cat.find({ ownerId, active: true }).distinct('_id');

    console.log(`🚫 Excluding ${myCatIds.length} my own cats:`, myCatIds);

    // Build basic query - opposite gender, not my cats, not swiped, not matched
    const query = {
      _id: { $nin: [...myCatIds, ...swipedCatIds, ...matchedCatIds] },
      ownerId: { $ne: ownerId },
      gender: myCat.gender === 'male' ? 'female' : 'male', // Opposite gender
      active: true,
      readyForBreeding: true
    };

    console.log('🎯 My cat:', { id: myCat._id, gender: myCat.gender, name: myCat.name });

    // Get potential matches (get more to allow for location filtering)
    const potentialCats = await Cat.find(query)
      .populate('ownerId', 'username avatar location phone')
      .limit(parseInt(limit) * 3) // Get more for smart filtering
      .sort({ createdAt: -1 });

    console.log(`📊 Found ${potentialCats.length} potential cats before location filter`);

    // Smart location-based filtering using new geolib system
    const filteredCats = [];
    const matchingStats = {
      gpsMatch: 0,
      provinceMatch: 0,
      unlimitedMatch: 0,
      rejected: 0
    };

    for (const cat of potentialCats) {
      const matchResult = canCatsMatch(
        owner,
        cat,
        { maxDistance, mode: matchingMode }
      );

      if (matchResult.canMatch) {
        const catWithDistance = {
          ...cat.toObject(),
          distance: matchResult.distance,
          matchReason: matchResult.reason
        };
        filteredCats.push(catWithDistance);

        // Update stats
        if (matchResult.distance !== null) {
          matchingStats.gpsMatch++;
        } else if (matchResult.reason.includes('province')) {
          matchingStats.provinceMatch++;
        } else {
          matchingStats.unlimitedMatch++;
        }

      } else {
        matchingStats.rejected++;
      }

      // Stop when we have enough cats
      if (filteredCats.length >= parseInt(limit)) {
        break;
      }
    }

    // Sort by distance (closest first) for GPS matches, random for others
    const sortedCats = filteredCats.sort((a, b) => {
      if (a.distance !== null && b.distance !== null) {
        return a.distance - b.distance; // Sort by distance
      } else if (a.distance !== null) {
        return -1; // GPS matches first
      } else if (b.distance !== null) {
        return 1; // GPS matches first
      } else {
        return Math.random() - 0.5; // Random for non-GPS matches
      }
    });

    console.log(`🎯 Final result: ${sortedCats.length} cats (GPS: ${matchingStats.gpsMatch}, Province: ${matchingStats.provinceMatch}, Unlimited: ${matchingStats.unlimitedMatch}, Rejected: ${matchingStats.rejected})`);

    const finalCats = sortedCats.slice(0, parseInt(limit));

    res.status(200).json({
      status: 'ok',
      data: {
        cats: finalCats,
        myCatId: myCat._id,
        matchingMode,
        matchingStats
      }
    });

  } catch (error) {
    console.error('Get cat feed error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get my cats
 * GET /api/cats/my-cats
 */
const getMyCats = async (req, res) => {
  try {
    const cats = await Cat.find({ ownerId: req.user.id })
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'ok',
      data: cats
    });

  } catch (error) {
    console.error('Get my cats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get single cat by ID
 * GET /api/cats/:id
 */
const getCatById = async (req, res) => {
  try {
    const cat = await Cat.findById(req.params.id)
      .populate('ownerId', 'username avatar location phone');

    if (!cat) {
      return res.status(404).json({
        status: 'error',
        message: 'Cat not found'
      });
    }

    res.status(200).json({
      status: 'ok',
      data: cat
    });

  } catch (error) {
    console.error('Get cat by ID error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Create new cat
 * POST /api/cats
 */
const createCat = async (req, res) => {
  try {
    const {
      name,
      gender,
      ageYears,
      ageMonths,
      breed,
      color,
      traits,
      readyForBreeding,
      vaccinated,
      neutered,
      notes
    } = req.body;

    // Validate required fields
    if (!name || !gender || !breed) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields: name, gender, breed'
      });
    }

    // Validate photos (at least 1, max 5)
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'At least 1 photo is required'
      });
    }

    if (req.files.length > 5) {
      return res.status(400).json({
        status: 'error',
        message: 'Maximum 5 photos allowed'
      });
    }

    // Upload photos to Cloudinary
    const photoUploadPromises = req.files.map(file =>
      uploadToCloudinary(file.buffer, 'pawmise/cats')
    );
    const uploadResults = await Promise.all(photoUploadPromises);

    const photos = uploadResults.map(result => ({
      url: result.secure_url,
      publicId: result.public_id
    }));

    // Get owner location
    const owner = await Owner.findById(req.user.id);
    if (!owner || !owner.location) {
      return res.status(400).json({
        status: 'error',
        message: 'Owner location not set'
      });
    }

    // Create cat
    const cat = await Cat.create({
      ownerId: req.user.id,
      name,
      gender,
      ageYears: ageYears || 0,
      ageMonths: ageMonths || 0,
      breed,
      color,
      traits: traits ? (Array.isArray(traits) ? traits : [traits]) : [],
      photos,
      readyForBreeding: readyForBreeding !== undefined ? readyForBreeding : true,
      vaccinated: vaccinated || false,
      neutered: neutered || false,
      notes,
      location: owner.location
    });

    res.status(201).json({
      status: 'ok',
      message: 'Cat created successfully',
      data: cat
    });

  } catch (error) {
    console.error('Create cat error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update cat
 * PUT /api/cats/:id
 */
const updateCat = async (req, res) => {
  try {
    console.log('🔄 Update cat request received for ID:', req.params.id);

    const cat = await Cat.findById(req.params.id);

    if (!cat) {
      return res.status(404).json({
        status: 'error',
        message: 'Cat not found'
      });
    }


    // Check ownership
    if (cat.ownerId.toString() !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to update this cat'
      });
    }

    const {
      name,
      ageYears,
      ageMonths,
      breed,
      color,
      traits,
      readyForBreeding,
      vaccinated,
      neutered,
      notes,
      active
    } = req.body;

    // Update fields
    if (name) cat.name = name;
    if (ageYears !== undefined) cat.ageYears = ageYears;
    if (ageMonths !== undefined) cat.ageMonths = ageMonths;
    if (breed) cat.breed = breed;
    if (color) cat.color = color;
    if (traits) cat.traits = Array.isArray(traits) ? traits : [traits];
    if (readyForBreeding !== undefined) cat.readyForBreeding = readyForBreeding;
    if (vaccinated !== undefined) cat.vaccinated = vaccinated;
    if (neutered !== undefined) cat.neutered = neutered;
    if (notes !== undefined) cat.notes = notes;
    if (active !== undefined) cat.active = active;

    // Handle photo updates
    let finalPhotos = [];

    // Parse existing photos from form data
    const existingPhotos = [];

    // Method 1: Try the array format
    let i = 0;
    while (req.body[`existingPhotos[${i}][url]`]) {
      existingPhotos.push({
        url: req.body[`existingPhotos[${i}][url]`],
        publicId: req.body[`existingPhotos[${i}][publicId]`]
      });
      i++;
    }

    // Method 2: If no array format found, try direct existingPhotos field
    if (existingPhotos.length === 0 && req.body.existingPhotos) {
      try {
        const parsed = typeof req.body.existingPhotos === 'string'
          ? JSON.parse(req.body.existingPhotos)
          : req.body.existingPhotos;
        if (Array.isArray(parsed)) {
          existingPhotos.push(...parsed);
        }
      } catch (e) {
        console.log('⚠️ Failed to parse existingPhotos field:', e.message);
      }
    }
    finalPhotos = [...existingPhotos];

    // Handle new photos if provided
    if (req.files && req.files.length > 0) {

      // Upload new photos
      const photoUploadPromises = req.files.map(file =>
        uploadToCloudinary(file.buffer, 'pawmise/cats')
      );
      const uploadResults = await Promise.all(photoUploadPromises);

      const newPhotos = uploadResults.map(result => ({
        url: result.secure_url,
        publicId: result.public_id
      }));

      finalPhotos = [...finalPhotos, ...newPhotos];
    }

    // Delete photos that are no longer needed
    const oldPhotos = cat.photos || [];
    const keptPublicIds = finalPhotos.map(photo => photo.publicId).filter(id => id);
    const photosToDelete = oldPhotos.filter(photo =>
      photo.publicId && !keptPublicIds.includes(photo.publicId)
    );

    if (photosToDelete.length > 0) {
      const publicIdsToDelete = photosToDelete.map(photo => photo.publicId);
      await deleteImages(publicIdsToDelete);
    }

    // Validate that we have at least 1 photo
    if (finalPhotos.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'At least 1 photo is required'
      });
    }

    // Validate max photos
    if (finalPhotos.length > 5) {
      return res.status(400).json({
        status: 'error',
        message: 'Maximum 5 photos allowed'
      });
    }

    // Update photos
    cat.photos = finalPhotos;

    await cat.save();

    res.status(200).json({
      status: 'ok',
      message: 'Cat updated successfully',
      data: cat
    });

  } catch (error) {
    console.error('Update cat error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Delete cat
 * DELETE /api/cats/:id
 */
const deleteCat = async (req, res) => {
  try {
    const cat = await Cat.findById(req.params.id);

    if (!cat) {
      return res.status(404).json({
        status: 'error',
        message: 'Cat not found'
      });
    }

    // Check ownership
    if (cat.ownerId.toString() !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to delete this cat'
      });
    }

    // Delete photos from Cloudinary
    const publicIds = cat.photos.map(photo => photo.publicId).filter(id => id);
    if (publicIds.length > 0) {
      await deleteImages(publicIds);
    }

    // Delete cat
    await Cat.findByIdAndDelete(req.params.id);

    res.status(200).json({
      status: 'ok',
      message: 'Cat deleted successfully'
    });

  } catch (error) {
    console.error('Delete cat error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getCatFeed,
  getMyCats,
  getCatById,
  createCat,
  updateCat,
  deleteCat
};
