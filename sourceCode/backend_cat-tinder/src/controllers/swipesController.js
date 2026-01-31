const Swipe = require('../models/Swipe');
const Match = require('../models/Match');
const Cat = require('../models/Cat');
const Owner = require('../models/Owner');

/**
 * Create a swipe (like or pass)
 * POST /api/swipes
 */
const createSwipe = async (req, res) => {
  try {
    const ownerId = req.user.id;
    const { swiperCatId, targetCatId, action } = req.body;

    // Validate input
    if (!swiperCatId || !targetCatId || !action) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields: swiperCatId, targetCatId, action'
      });
    }

    if (!['like', 'interested', 'pass'].includes(action)) {
      return res.status(400).json({
        status: 'error',
        message: 'action must be "like", "interested", or "pass"'
      });
    }

    // Verify swiper cat belongs to this owner
    const swiperCat = await Cat.findOne({ _id: swiperCatId, ownerId });
    if (!swiperCat) {
      return res.status(403).json({
        status: 'error',
        message: 'This cat does not belong to you'
      });
    }

    // Verify target cat exists
    const targetCat = await Cat.findById(targetCatId).populate('ownerId');
    if (!targetCat) {
      return res.status(404).json({
        status: 'error',
        message: 'Target cat not found'
      });
    }

    // Check daily interest limit if action is 'interested' (per cat, not per owner)
    if (action === 'interested') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      console.log(`🔍 Checking interest limit for cat: ${swiperCat.name} (${swiperCat._id})`);
      console.log(`📊 Current cat interestUsage:`, swiperCat.interestUsage);
      console.log(`📅 Today:`, today.toDateString());

      // Reset count if it's a new day
      let currentCount = 0;
      if (swiperCat.interestUsage && swiperCat.interestUsage.date) {
        const lastUsageDate = new Date(swiperCat.interestUsage.date);
        lastUsageDate.setHours(0, 0, 0, 0);

        if (lastUsageDate.getTime() === today.getTime()) {
          // Same day - use existing count
          currentCount = swiperCat.interestUsage.count || 0;
        } else {
          // Different day - reset count to 0
          console.log(`🔄 New day detected - resetting count for ${swiperCat.name}`);
          currentCount = 0;
        }
      }

      console.log(`📊 Current interest count for today: ${currentCount}`);

      // Check if this cat has reached daily limit
      if (currentCount >= 1) {
        console.log(`❌ Cat ${swiperCat.name} has already used daily interest (count: ${currentCount})`);
        return res.status(400).json({
          status: 'error',
          message: `${swiperCat.name} has already used their daily interest. Try again tomorrow!`,
          code: 'DAILY_LIMIT_EXCEEDED'
        });
      } else {
        console.log(`✅ Cat ${swiperCat.name} can use interest today (count: ${currentCount})`);
      }
    }

    // Create swipe
    let swipe;
    try {
      console.log(`🔄 Creating swipe - swiperCatId: ${swiperCatId}, targetCatId: ${targetCatId}, action: ${action}`);

      swipe = await Swipe.create({
        swiperOwnerId: ownerId,
        swiperCatId,
        targetCatId,
        action
      });

      console.log(`✅ Swipe created successfully - swipeId: ${swipe._id}, action: ${action}`);
    } catch (err) {
      console.error(`❌ Swipe creation failed:`, err);
      if (err.code === 11000) {
        console.log(`❌ Duplicate swipe attempted - swiperCatId: ${swiperCatId}, targetCatId: ${targetCatId}`);
        return res.status(400).json({
          status: 'error',
          message: 'You already swiped this cat'
        });
      }
      throw err;
    }

    let match = null;

    // If action is 'like' or 'interested', check for match potential
    if (action === 'like' || action === 'interested') {
      console.log(`🔍 Checking for reverse swipe for match detection...`);
      console.log(`🎯 Looking for: swiperOwnerId: ${targetCat.ownerId._id}, swiperCatId: ${targetCatId}, targetCatId: ${swiperCatId}`);

      const reverseSwipe = await Swipe.findOne({
        swiperOwnerId: targetCat.ownerId._id,
        swiperCatId: targetCatId,
        targetCatId: swiperCatId,
        action: { $in: ['like', 'interested'] }
      });

      console.log(`🔍 Reverse swipe found:`, reverseSwipe ? 'YES' : 'NO');
      if (reverseSwipe) {
        console.log(`📋 Reverse swipe details:`, {
          id: reverseSwipe._id,
          action: reverseSwipe.action,
          createdAt: reverseSwipe.createdAt
        });
        console.log(`💕 MATCH DETECTED! Creating match...`);
        // Mutual like! Create match
        // Sort cat IDs to prevent duplicate matches
        const [catAId, catBId] = [swiperCatId.toString(), targetCatId.toString()].sort();
        const [ownerAId, ownerBId] = swiperCatId.toString() < targetCatId.toString()
          ? [ownerId, targetCat.ownerId._id]
          : [targetCat.ownerId._id, ownerId];

        try {
          console.log(`🔄 Creating match with data:`, { catAId, ownerAId, catBId, ownerBId });

          match = await Match.create({
            catAId,
            ownerAId,
            catBId,
            ownerBId
          });

          console.log(`✅ Match created successfully with ID: ${match._id}`);

          // Populate match data
          match = await Match.findById(match._id)
            .populate('catAId', 'name gender ageYears ageMonths breed photos')
            .populate('catBId', 'name gender ageYears ageMonths breed photos')
            .populate('ownerAId', 'displayName avatarUrl location phone')
            .populate('ownerBId', 'displayName avatarUrl location phone');

          console.log(`✅ Match populated successfully:`, {
            matchId: match._id,
            catA: match.catAId?.name,
            catB: match.catBId?.name
          });

          // TODO: Emit Socket.io event 'new_match' to both owners
          // io.to(ownerAId).emit('new_match', match);
          // io.to(ownerBId).emit('new_match', match);

        } catch (err) {
          // If match already exists (duplicate), just fetch it
          if (err.code === 11000) {
            match = await Match.findOne({
              $or: [
                { catAId: catAId, catBId: catBId },
                { catAId: catBId, catBId: catAId }
              ]
            })
              .populate('catAId', 'name gender ageYears ageMonths breed photos')
              .populate('catBId', 'name gender ageYears ageMonths breed photos')
              .populate('ownerAId', 'displayName avatarUrl location phone')
              .populate('ownerBId', 'displayName avatarUrl location phone');
          } else {
            throw err;
          }
        }
      }
    }

    // Update interest usage counter if action is 'interested' (per cat)
    if (action === 'interested') {
      console.log(`🔄 Updating interest usage for cat: ${swiperCat.name} (${swiperCat._id})`);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      try {
        // Calculate new count based on existing usage
        let newCount = 1;
        if (swiperCat.interestUsage && swiperCat.interestUsage.date) {
          const lastUsageDate = new Date(swiperCat.interestUsage.date);
          lastUsageDate.setHours(0, 0, 0, 0);

          if (lastUsageDate.getTime() === today.getTime()) {
            // Same day - increment existing count
            newCount = (swiperCat.interestUsage.count || 0) + 1;
          } else {
            // Different day - reset to 1
            newCount = 1;
          }
        }

        const updateResult = await Cat.findByIdAndUpdate(swiperCatId, {
          'interestUsage.date': today,
          'interestUsage.count': newCount
        }, { new: true });

        console.log(`✅ Interest usage updated successfully for cat: ${swiperCat.name}`);
        console.log(`📊 Updated cat interestUsage:`, updateResult.interestUsage);
        console.log(`📊 New count: ${newCount}`);
      } catch (updateError) {
        console.error(`❌ Failed to update cat interest usage:`, updateError);
        throw updateError;
      }
    }

    console.log(`✅ Swipe operation completed successfully`);
    console.log(`📊 Final response data:`, {
      swipeId: swipe._id,
      action: swipe.action,
      matched: !!match,
      matchId: match?._id || null
    });

    if (match) {
      console.log(`💕 SENDING MATCH RESPONSE TO FRONTEND!`);
      console.log(`📋 Match data being sent:`, JSON.stringify({
        id: match._id,
        catA: match.catAId?.name,
        catB: match.catBId?.name,
        hasPhotos: {
          catA: !!match.catAId?.photos?.[0],
          catB: !!match.catBId?.photos?.[0]
        }
      }, null, 2));
    } else {
      console.log(`📤 No match - sending regular swipe response`);
    }

    res.status(201).json({
      status: 'ok',
      message: 'Swipe recorded successfully',
      data: {
        swipe,
        matched: !!match,
        match: match || null
      }
    });

  } catch (error) {
    console.error('Create swipe error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get likes sent by a specific cat
 * GET /api/swipes/likes-sent/:catId
 */
const getLikesSent = async (req, res) => {
  try {
    const ownerId = req.user.id;
    const { catId } = req.params;

    console.log(`🔄 getLikesSent - ownerId: ${ownerId}, catId: ${catId}`);

    // Verify cat belongs to owner
    const cat = await Cat.findOne({ _id: catId, ownerId });
    if (!cat) {
      console.log(`❌ Cat not found or doesn't belong to owner - catId: ${catId}, ownerId: ${ownerId}`);
      return res.status(404).json({
        status: 'error',
        message: 'Cat not found or does not belong to you'
      });
    }

    console.log(`✅ Cat verified - name: ${cat.name}`);

    // Get all interests sent by this cat
    const swipes = await Swipe.find({
      swiperCatId: catId,
      action: 'interested'
    })
      .populate({
        path: 'targetCatId',
        select: 'name gender ageYears ageMonths breed color photos location vaccinated neutered readyForBreeding traits notes',
        populate: {
          path: 'ownerId',
          select: 'username displayName avatar phone location'
        }
      })
      .sort({ createdAt: -1 });

    console.log(`📊 Found ${swipes.length} interest swipes sent by cat ${cat.name}`);

    if (swipes.length > 0) {
      console.log('📋 Sample swipe data:', JSON.stringify(swipes[0], null, 2));
    }

    res.status(200).json({
      status: 'ok',
      data: swipes
    });

  } catch (error) {
    console.error('Get likes sent error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get likes received by a specific cat
 * GET /api/swipes/likes-received/:catId
 */
const getLikesReceived = async (req, res) => {
  try {
    const ownerId = req.user.id;
    const { catId } = req.params;

    console.log(`🔄 getLikesReceived - ownerId: ${ownerId}, catId: ${catId}`);

    // Verify cat belongs to owner
    const cat = await Cat.findOne({ _id: catId, ownerId });
    if (!cat) {
      console.log(`❌ Cat not found or doesn't belong to owner - catId: ${catId}, ownerId: ${ownerId}`);
      return res.status(404).json({
        status: 'error',
        message: 'Cat not found or does not belong to you'
      });
    }

    console.log(`✅ Cat verified - name: ${cat.name}`);

    // Get all interests received by this cat
    const swipes = await Swipe.find({
      targetCatId: catId,
      action: 'interested'
    })
      .populate({
        path: 'swiperCatId',
        select: 'name gender ageYears ageMonths breed color photos location vaccinated neutered readyForBreeding traits notes',
        populate: {
          path: 'ownerId',
          select: 'username displayName avatar phone location'
        }
      })
      .sort({ createdAt: -1 });

    console.log(`📊 Found ${swipes.length} interest swipes received by cat ${cat.name}`);

    if (swipes.length > 0) {
      console.log('📋 Sample received swipe data:', JSON.stringify(swipes[0], null, 2));
    }

    res.status(200).json({
      status: 'ok',
      data: swipes
    });

  } catch (error) {
    console.error('Get likes received error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get daily interest status for a specific cat
 * GET /api/swipes/interest-status/:catId
 */
const getInterestStatus = async (req, res) => {
  try {
    const ownerId = req.user.id;
    const { catId } = req.params;

    console.log(`🔄 Getting interest status for cat: ${catId}, owner: ${ownerId}`);

    // Verify cat belongs to owner
    const cat = await Cat.findOne({ _id: catId, ownerId });
    if (!cat) {
      return res.status(404).json({
        status: 'error',
        message: 'Cat not found or does not belong to you'
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    console.log(`📊 Cat ${cat.name} interestUsage:`, cat.interestUsage);
    console.log(`📅 Today:`, today.toDateString());

    // Calculate current count for today
    let currentCount = 0;
    if (cat.interestUsage && cat.interestUsage.date) {
      const lastUsageDate = new Date(cat.interestUsage.date);
      lastUsageDate.setHours(0, 0, 0, 0);

      if (lastUsageDate.getTime() === today.getTime()) {
        // Same day - use existing count
        currentCount = cat.interestUsage.count || 0;
      } else {
        // Different day - count is 0
        currentCount = 0;
      }
    }

    const hasUsedToday = currentCount >= 1;
    console.log(`✅ Interest status for ${cat.name} - currentCount: ${currentCount}, hasUsedToday: ${hasUsedToday}`);

    res.status(200).json({
      status: 'ok',
      data: {
        hasUsedToday,
        currentCount,
        remainingUses: hasUsedToday ? 0 : 1,
        catName: cat.name,
        debug: {
          interestUsage: cat.interestUsage,
          today: today.toDateString()
        }
      }
    });

  } catch (error) {
    console.error('Get interest status error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Reset daily interest usage for a specific cat (for debugging)
 * DELETE /api/swipes/interest-status/:catId
 */
const resetInterestUsage = async (req, res) => {
  try {
    const ownerId = req.user.id;
    const { catId } = req.params;

    console.log(`🔄 Resetting interest usage for cat: ${catId}, owner: ${ownerId}`);

    // Verify cat belongs to owner
    const cat = await Cat.findOne({ _id: catId, ownerId });
    if (!cat) {
      return res.status(404).json({
        status: 'error',
        message: 'Cat not found or does not belong to you'
      });
    }

    await Cat.findByIdAndUpdate(catId, {
      $unset: { interestUsage: 1 }
    });

    console.log(`✅ Interest usage reset successfully for cat: ${cat.name}`);

    res.status(200).json({
      status: 'ok',
      message: `Interest usage reset successfully for ${cat.name}`
    });

  } catch (error) {
    console.error('Reset interest usage error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Reset daily interest usage for all cats of an owner (for debugging)
 * DELETE /api/swipes/interest-status-all
 */
const resetAllInterestUsage = async (req, res) => {
  try {
    const ownerId = req.user.id;

    console.log(`🔄 Resetting interest usage for all cats of owner: ${ownerId}`);

    // Find all cats belonging to this owner
    const cats = await Cat.find({ ownerId });

    if (cats.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'No cats found for this owner'
      });
    }

    // Reset interest usage for all cats
    const result = await Cat.updateMany(
      { ownerId },
      { $unset: { interestUsage: 1 } }
    );

    console.log(`✅ Interest usage reset successfully for ${result.modifiedCount} cats`);

    res.status(200).json({
      status: 'ok',
      message: `Interest usage reset successfully for ${result.modifiedCount} cats`,
      data: {
        catsAffected: result.modifiedCount,
        catNames: cats.map(cat => cat.name)
      }
    });

  } catch (error) {
    console.error('Reset all interest usage error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  createSwipe,
  getLikesSent,
  getLikesReceived,
  getInterestStatus,
  resetInterestUsage,
  resetAllInterestUsage
};
