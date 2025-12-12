import firestore from '@react-native-firebase/firestore'

export const subscribeToDriver = (config, driverID, callback) => {
  if (!driverID?.trim()) {
    return () => {}
  }
  // We're listening to the incoming requests for orders
  const ref = firestore()
    .collection(config.FIREBASE_COLLECTIONS.USERS)
    .doc(driverID)

  return ref.onSnapshot(
    snapshot => {
      const data = snapshot.data()

      callback?.(data)
    },
    error => {
      console.warn(error)
    },
  )
}

export const goOnline = async (config, driverID) => {
  if (!driverID) {
    return
  }
  return firestore()
    .collection(config.FIREBASE_COLLECTIONS.USERS)
    .doc(driverID)
    .update({ isActive: true })
}

export const goOffline = async (config, driverID) => {
  if (!driverID) {
    return
  }
  return firestore()
    .collection(config.FIREBASE_COLLECTIONS.USERS)
    .doc(driverID)
    .update({ isActive: false })
}
