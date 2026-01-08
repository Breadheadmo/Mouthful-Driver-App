import firestore from '@react-native-firebase/firestore'
import { functions } from '../../../core/firebase/config'

// Subscribe to orders assigned to driver via assignedDrivers array
export const subscribeToAssignedOrders = (config, driverID, callback) => {
  if (!driverID) {
    return () => {}
  }

  const ref = firestore()
    .collection(config.FIREBASE_COLLECTIONS.ORDERS)
    .where('assignedDrivers', 'array-contains-any', [driverID])
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
      console.warn('subscribeToAssignedOrders error:', error)
    },
  )
}

// Legacy: Subscribe to orders with single driverID (backward compatibility)
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

    const orderRef = firestore().collection(config.FIREBASE_COLLECTIONS.ORDERS).doc(order.id)

    const orderSnap = await orderRef.get()
    if (!orderSnap.exists) {
      console.log('Accept failed: order not found', order.id)
      return
    }

    const orderData = orderSnap.data()
    const assignedDrivers = orderData?.assignedDrivers || []
    const driverIndex = assignedDrivers.findIndex(ad => ad.driverId === driver.id)

    // If using assignedDrivers array, update driver's status in array
    if (driverIndex !== -1) {
      assignedDrivers[driverIndex].status = 'Accepted'
      assignedDrivers[driverIndex].acceptedAt = new Date()
      await orderRef.update({
        assignedDrivers,
        status: 'Accepted',
      })
    } else {
      // Fallback: legacy driverID field
      await orderRef.update({
        status: 'Accepted',
      })
    }

    const notify = functions().httpsCallable('sendPushNofications')
    await notify({
      data: {
        toUserID: orderData.vendorId || '5FG2G0svoSaE58pKGDTXpB2GD5D3',
        titleStr: 'Order Accepted',
        contentStr: `Driver ${driver.name || 'Driver'} accepted order`,
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

    const orderRef = firestore().collection(config.FIREBASE_COLLECTIONS.ORDERS).doc(order.id)

    const snap = await orderRef.get()
    if (!snap.exists) {
      console.log('Update status failed: order not found', order.id)
      return
    }

    await orderRef.update({
      status: 'In Transit',
      inTransitAt: new Date(),
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

    const orderRef = firestore().collection(config.FIREBASE_COLLECTIONS.ORDERS).doc(order.id)

    const snap = await orderRef.get()
    if (!snap.exists) {
      console.log('Reject failed: order not found', order.id)
      return
    }

    const orderData = snap.data()
    const assignedDrivers = orderData?.assignedDrivers || []
    
    // If using assignedDrivers array, mark as rejected or remove
    if (assignedDrivers.length > 0) {
      const driverIndex = assignedDrivers.findIndex(ad => ad.driverId === driver.id)
      if (driverIndex !== -1) {
        assignedDrivers[driverIndex].status = 'Rejected'
        assignedDrivers[driverIndex].rejectedAt = new Date()
      }
      await orderRef.update({ assignedDrivers })
    } else {
      // Fallback: legacy rejectedByDrivers field
      const rejectedByDrivers = orderData.rejectedByDrivers || []
      rejectedByDrivers.push(driver.id)
      await orderRef.update({
        rejectedByDrivers,
      })
    }
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

    await ref.update({ 
      status: 'Picked Up',
      pickedUpAt: new Date(),
    })
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

    await orderRef.update({ 
      status: 'Delivered',
      deliveredAt: new Date(),
      deliveredBy: driver.id,
    })

    await firestore()
      .collection(config.FIREBASE_COLLECTIONS.USERS)
      .doc(driver.id)
      .update({ inProgressOrderID: null, orderRequestData: null })

    console.log('Order marked as delivered:', order.id)
  } catch (error) {
    console.log('Mark as completed error:', error)
  }
}
