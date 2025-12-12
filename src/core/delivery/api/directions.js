import Polyline from '@mapbox/polyline'

export const getDirections = async (
  startLoc,
  destinationLoc,
  apiKey,
  callback,
) => {
  try {
    // Validate coordinates before making request
    if (
      !startLoc?.latitude || !startLoc?.longitude ||
      !destinationLoc?.latitude || !destinationLoc?.longitude
    ) {
      console.log('Invalid coordinates provided to getDirections')
      callback && callback([]) // return empty array
      return
    }

    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${startLoc.latitude},${startLoc.longitude}&destination=${destinationLoc.latitude},${destinationLoc.longitude}&key=${apiKey}`
    let resp = await fetch(url)
    let respJson = await resp.json()

    // Handle invalid or ZERO_RESULTS responses safely
    if (!respJson || respJson.status !== 'OK' || !respJson.routes || respJson.routes.length < 1) {
      console.log('Directions API error:', respJson?.status, respJson?.error_message)
      callback && callback([]) // return empty array to avoid crash
      return
    }

    const polylinePoints = respJson.routes[0]?.overview_polyline?.points
    if (!polylinePoints) {
      console.log('No polyline found in response')
      callback && callback([]) // return empty array
      return
    }

    let points = Polyline.decode(polylinePoints)
    let coords = points.map((point) => ({
      latitude: point[0],
      longitude: point[1],
    }))

    callback && callback(coords)
  } catch (error) {
    console.log('getDirections error:', error)
    callback && callback([]) // ensure callback always returns an array
  }
}

/*
 ** Returns (callback) the number of seconds a car needs to drive from start to end
 */
export const getETA = async (start, end, apiKey) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (
        !start?.latitude || !start?.longitude ||
        !end?.latitude || !end?.longitude
      ) {
        console.log('Invalid coordinates provided to getETA')
        return resolve(null) // safely return null instead of rejecting
      }

      const etaRequestURL = `https://maps.googleapis.com/maps/api/distancematrix/json?units=imperial&origins=${start.latitude},${start.longitude}&destinations=${end.latitude},${end.longitude}&key=${apiKey}`

      const matrix = await fetch(etaRequestURL)
      const matrixJson = await matrix.json()
      console.log(JSON.stringify(matrixJson))

      const rows = matrixJson.rows
      if (!rows || rows.length < 1) {
        return resolve(null)
      }

      const elements = rows[0].elements
      if (!elements || elements.length < 1 || elements[0].status !== 'OK') {
        return resolve(null)
      }

      resolve(elements[0]?.duration?.value)
    } catch (error) {
      console.log('getETA error:', error)
      resolve(null) // safely resolve null on error
    }
  })
}
