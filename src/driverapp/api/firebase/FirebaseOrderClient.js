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
      console.warn('subscribeToOrders error:', error)
    },
  )
}

export const subscribeToInprogressOrder = (config, orderID, callback) => {
  if (!orderID || !orderID.trim()) {
    return () => {}
  }

  return firestore()
    .collection(config.FIREBASE_COLLECTIONS.ORDERS)
    .doc(orderID)
    .onSnapshot(
      snapshot => {
        if (!snapshot.exists) {
          console.log('In-progress order not found:', orderID)
          return
        }
        callback?.(snapshot.data())
      },
      error => {
        console.log('subscribeToInprogressOrder error:', error)
      },
    )
}

export const accept = async (config, order, driver) => {
  try {
    if (!driver?.id || !order?.id) {
      return
    }

    const orderRef = firestore()
      .collection('restaurant_orders')
      .doc(order.id)

    const orderSnap = await orderRef.get()
    if (!orderSnap.exists) {
      console.log('Accept failed: order not found', order.id)
      return
    }

    await orderRef.update({
      status: 'Order Accepted',
    })

    const notify = functions().httpsCallable('sendPushNofications')
    await notify({
      data: {
        toUserID: '5FG2G0svoSaE58pKGDTXpB2GD5D3',
        titleStr: 'Order Accepted',
        contentStr: 'Driver accepted order',
        type: 'notifications',
        orderID: order.id,
      },
    }).catch(error => {
      console.log('Push notification error:', error)
    })
  } catch (error) {
    console.log('Accept order error:', error)
  }
}

export const updateStatus = async (config, order, driver) => {
  try {
    if (!driver?.id || !order?.id) {
      return
    }

    const orderRef = firestore()
      .collection('restaurant_orders')
      .doc(order.id)

    const snap = await orderRef.get()
    if (!snap.exists) {
      console.log('Update status failed: order not found', order.id)
      return
    }

    await orderRef.update({
      status: 'In Transit',
    })
  } catch (error) {
    console.log('Update status error:', error)
  }
}

export const reject = async (config, order, driver) => {
  try {
    if (!driver?.id || !order?.id) {
      return
    }

    const orderRef = firestore()
      .collection('restaurant_orders')
      .doc(order.id)

    const snap = await orderRef.get()
    if (!snap.exists) {
      console.log('Reject failed: order not found', order.id)
      return
    }

    const rejectedByDrivers = order.rejectedByDrivers || []
    rejectedByDrivers.push(driver.id)

    await orderRef.update({
      status: 'Driver Rejected',
      rejectedByDrivers,
    })
  } catch (error) {
    console.log('Reject order error:', error)
  }
}

export const onDelete = async (config, orderID) => {
  try {
    if (!orderID) {
      return
    }

    const ref = firestore()
      .collection(config.FIREBASE_COLLECTIONS.ORDERS)
      .doc(orderID)

    const snap = await ref.get()
    if (!snap.exists) {
      console.log('Delete skipped: order not found', orderID)
      return
    }

    await ref.delete()
    console.log('Order deleted successfully:', orderID)
  } catch (error) {
    console.log('Delete order error:', error)
  }
}

export const markAsPickedUp = async (config, order) => {
  try {
    if (!order?.id) {
      return
    }

    const ref = firestore()
      .collection(config.FIREBASE_COLLECTIONS.ORDERS)
      .doc(order.id)

    const snap = await ref.get()
    if (!snap.exists) {
      console.log('Pick up failed: order not found', order.id)
      return
    }

    await ref.update({ status: 'In Transit' })
    console.log('Order marked as picked up:', order.id)
  } catch (error) {
    console.log('Mark as picked up error:', error)
  }
}

export const markAsCompleted = async (config, order, driver) => {
  try {
    if (!order?.id || !driver?.id) {
      return
    }

    const orderRef = firestore()
      .collection(config.FIREBASE_COLLECTIONS.ORDERS)
      .doc(order.id)

    const orderSnap = await orderRef.get()
    if (!orderSnap.exists) {
      console.log('Complete failed: order not found', order.id)
      return
    }

    await orderRef.update({ status: 'Order Completed' })

    await firestore()
      .collection(config.FIREBASE_COLLECTIONS.USERS)
      .doc(driver.id)
      .update({ inProgressOrderID: null, orderRequestData: null })

    console.log('Order marked as completed:', order.id)
  } catch (error) {
    console.log('Mark as completed error:', error)
  }
}
