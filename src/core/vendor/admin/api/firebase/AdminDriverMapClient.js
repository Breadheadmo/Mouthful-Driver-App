import { db } from '../../../../firebase/config'

/**
 * Subscribe to all active drivers for the admin dashboard
 * Filters for drivers with isActive = true and valid location data
 */
export const subscribeToActiveDrivers = (callback) => {
  return db
    .collection('users')
    .where('isActive', '==', true)
    .onSnapshot(
      querySnapshot => {
        const drivers = []
        querySnapshot?.forEach(doc => {
          const driver = doc.data()
          
          // Only include drivers with valid location data
          if (driver.location?.latitude && driver.location?.longitude) {
            drivers.push({
              id: doc.id,
              data: driver,
            })
          }
        })
        callback?.(drivers)
      },
      error => {
        console.warn('Error fetching active drivers:', error)
      },
    )
}

/**
 * Calculate distance between two coordinates in kilometers
 * Uses Haversine formula
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371 // Earth's radius in km
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = R * c
  
  return distance
}

const toRad = value => {
  return (value * Math.PI) / 180
}

/**
 * Get nearest drivers to a specific location
 * @param {Array} drivers - Array of driver objects with location data
 * @param {Object} targetLocation - { latitude, longitude }
 * @param {Number} maxDistance - Maximum distance in km (optional)
 * @returns {Array} Sorted array of drivers with distance property
 */
export const getNearestDrivers = (drivers, targetLocation, maxDistance = null) => {
  if (!targetLocation?.latitude || !targetLocation?.longitude) {
    return []
  }

  const driversWithDistance = drivers
    .map(driver => {
      const distance = calculateDistance(
        targetLocation.latitude,
        targetLocation.longitude,
        driver.data.location.latitude,
        driver.data.location.longitude,
      )

      return {
        ...driver,
        distance: distance.toFixed(2), // Distance in km
      }
    })
    .filter(driver => {
      // Filter by max distance if specified
      if (maxDistance !== null) {
        return parseFloat(driver.distance) <= maxDistance
      }
      return true
    })
    .sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance))

  return driversWithDistance
}
