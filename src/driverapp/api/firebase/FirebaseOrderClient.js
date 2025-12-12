import firestore from '@react-native-firebase/firestore'
import { functions } from '../../../core/firebase/config'

export const subscribeToOrders = (config, driverID, callback) => {
  if (!driverID) {
    return () => {}
  }
  const ref = firestore()
    .collection(config.FIREBASE_COLLECTIONS.ORDERS)
    .where('driverID', '==', driverID)
    .orderBy('createdAt', 'desc')

  return ref.onSnapshot(
    querySnapshot => {
      const orders = []
      querySnapshot?.forEach(doc => {
        const order = doc.data()
        orders.push({
          id: doc.id,
          ...order,
        })
      })
      callback?.(orders)
    },
    error => {
      console.warn(error)
    },
  )
}

export const subscribeToInprogressOrder = (config, orderID, callback) => {
  if (!orderID?.trim) {
    return () => {}
  }

  return firestore()
    .collection(config.FIREBASE_COLLECTIONS.ORDERS)
    .doc(orderID)
    .onSnapshot(
      snapshot => {
        callback?.(snapshot.data())
      },
      error => {
        console.log(error)
      },
    )
}

export const accept = async (config, order, driver) => {
  if (!driver || !driver.id || driver.id.length === 0) {
    return
  }
  if (!order || !order.id || order.id.length === 0) {
    return
  }
  firestore().collection('restaurant_orders').doc(order.id).update({
    status: 'Order Accepted',
    // driver,
    // driverID: driver.id,
  })
  const notify = functions().httpsCallable('sendPushNofications')
  notify({
    data: {
      toUserID:  "5FG2G0svoSaE58pKGDTXpB2GD5D3",
      titleStr: 'Order Accepted',
      contentStr: 'Driver accepted order',
      type: 'notifications',
      orderID: order.id,
    },
  })
  // firestore()
  //   .collection(config.FIREBASE_COLLECTIONS.USERS)
  //   .doc(driver.id)
  //   .update({
  //     orderRequestData: null,
  //     inProgressOrderID: order.id,
  //   })
}

export const updateStatus = async (config, order, driver) => {
  if (!driver || !driver.id || driver.id.length === 0) {
    return
  }
  if (!order || !order.id || order.id.length === 0) {
    return
  }
  firestore().collection('restaurant_orders').doc(order.id).update({
    status: 'In Transit',
  })
}

export const reject = async (config, order, driver) => {
  var rejectedByDrivers = order.rejectedByDrivers ? order.rejectedByDrivers : []
  rejectedByDrivers.push(driver.id)

  // firestore()
  //   .collection(this.config.FIREBASE_COLLECTIONS.USERS)
  //   .doc(driver.id)
  //   .update({ orderRequestData: null })

  firestore().collection('restaurant_orders').doc(order.id).update({
    status: 'Driver Rejected',
  })
}

export const onDelete = (config, orderID) => {
  firestore()
    .collection(config.FIREBASE_COLLECTIONS.ORDERS)
    .doc(orderID)
    .delete()
    .then(result => console.warn(result))
}

export const markAsPickedUp = async (config, order) => {
  firestore()
    .collection(config.FIREBASE_COLLECTIONS.ORDERS)
    .doc(order.id)
    .update({ status: 'In Transit' })
}

export const markAsCompleted = async (config, order, driver) => {
  firestore()
    .collection(config.FIREBASE_COLLECTIONS.ORDERS)
    .doc(order.id)
    .update({ status: 'Order Completed' })

  firestore()
    .collection(config.FIREBASE_COLLECTIONS.USERS)
    .doc(driver.id)
    .update({ inProgressOrderID: null, orderRequestData: null })
}
