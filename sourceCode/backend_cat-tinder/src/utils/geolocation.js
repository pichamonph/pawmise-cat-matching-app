const { getDistance } = require('geolib');

/**
 * Calculate distance between two coordinates in kilometers
 * @param {Object} coords1 - {lat: number, lng: number}
 * @param {Object} coords2 - {lat: number, lng: number}
 * @returns {number} Distance in kilometers
 */
const calculateDistance = (coords1, coords2) => {
  try {
    const distanceInMeters = getDistance(
      { latitude: coords1.lat, longitude: coords1.lng },
      { latitude: coords2.lat, longitude: coords2.lng }
    );

    return Math.round(distanceInMeters / 1000); // Convert to km
  } catch (error) {
    console.error('Error calculating distance:', error);
    return null;
  }
};

/**
 * Check if two locations are within a specific radius
 * @param {Object} coords1 - {lat: number, lng: number}
 * @param {Object} coords2 - {lat: number, lng: number}
 * @param {number} radiusKm - Radius in kilometers
 * @returns {boolean}
 */
const isWithinRadius = (coords1, coords2, radiusKm = 50) => {
  const distance = calculateDistance(coords1, coords2);
  return distance !== null && distance <= radiusKm;
};

/**
 * Smart matching function that works with or without location data
 * @param {Object} ownerData - Owner info {location: {lat, lng, province}, preferences}
 * @param {Object} catData - Cat info {location: {lat, lng}, ownerId}
 * @param {Object} options - Matching options {maxDistance, mode}
 * @returns {Object} {canMatch: boolean, distance: number|null, reason: string}
 */
const canCatsMatch = (ownerData, catData, options = {}) => {
  const { maxDistance = 100, mode = 'flexible' } = options;

  // Extract location data safely
  const ownerLocation = ownerData?.location;
  const catLocation = catData?.location;

  const hasOwnerCoords = ownerLocation?.lat && ownerLocation?.lng;
  const hasCatCoords = catLocation?.lat && catLocation?.lng;

  switch (mode) {
    case 'strict':
      // Must have both GPS coordinates
      if (!hasOwnerCoords || !hasCatCoords) {
        return { canMatch: false, distance: null, reason: 'Missing GPS coordinates' };
      }
      const strictDistance = calculateDistance(ownerLocation, catLocation);
      return {
        canMatch: strictDistance !== null && strictDistance <= maxDistance,
        distance: strictDistance,
        reason: strictDistance > maxDistance ? `Too far: ${strictDistance}km` : 'Within range'
      };

    case 'province':
      // Match by province first, then GPS if available
      const ownerProvince = ownerLocation?.province;
      const catOwnerProvince = catData?.ownerId?.location?.province;

      if (ownerProvince && catOwnerProvince) {
        if (ownerProvince === catOwnerProvince) {
          // Same province - check GPS distance if available
          if (hasOwnerCoords && hasCatCoords) {
            const provinceDistance = calculateDistance(ownerLocation, catLocation);
            return {
              canMatch: provinceDistance <= maxDistance,
              distance: provinceDistance,
              reason: `Same province (${ownerProvince})`
            };
          }
          return { canMatch: true, distance: null, reason: `Same province (${ownerProvince})` };
        } else {
          return { canMatch: false, distance: null, reason: 'Different provinces' };
        }
      }
      // Fall through to flexible mode if no province data

    case 'flexible':
    default:
      // Best effort matching
      if (hasOwnerCoords && hasCatCoords) {
        // Both have GPS - use distance
        const flexDistance = calculateDistance(ownerLocation, catLocation);
        return {
          canMatch: flexDistance !== null && flexDistance <= maxDistance,
          distance: flexDistance,
          reason: flexDistance > maxDistance ? `Too far: ${flexDistance}km` : 'GPS match'
        };
      } else if (ownerLocation?.province && catData?.ownerId?.location?.province) {
        // Use province matching as fallback
        const sameProvince = ownerLocation.province === catData.ownerId.location.province;
        return {
          canMatch: sameProvince,
          distance: null,
          reason: sameProvince ? 'Same province' : 'Different provinces'
        };
      } else {
        // No location data - allow matching (open to all)
        return { canMatch: true, distance: null, reason: 'No location restrictions' };
      }

    case 'unlimited':
      // No distance restrictions
      if (hasOwnerCoords && hasCatCoords) {
        const unlimitedDistance = calculateDistance(ownerLocation, catLocation);
        return { canMatch: true, distance: unlimitedDistance, reason: 'Unlimited range' };
      }
      return { canMatch: true, distance: null, reason: 'Unlimited range' };
  }
};

/**
 * Get appropriate matching mode based on user/system preferences
 * @param {Object} owner - Owner object
 * @param {Object} systemConfig - System configuration
 * @returns {string} Matching mode
 */
const getMatchingMode = (owner, systemConfig = {}) => {
  // User preference takes priority
  if (owner?.preferences?.matchingMode) {
    return owner.preferences.matchingMode;
  }

  // Auto-detect best mode based on available data
  const hasGPS = owner?.location?.lat && owner?.location?.lng;
  const hasProvince = owner?.location?.province;

  if (hasGPS) {
    return systemConfig.defaultMode || 'flexible';
  } else if (hasProvince) {
    return 'province';
  } else {
    return 'unlimited';
  }
};

module.exports = {
  calculateDistance,
  isWithinRadius,
  canCatsMatch,
  getMatchingMode
};
