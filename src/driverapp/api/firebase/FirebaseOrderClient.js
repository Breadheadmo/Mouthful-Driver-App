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
  try {
    if (!driver || !driver.id || driver.id.length === 0) {
      return
    }
    if (!order || !order.id || order.id.length === 0) {
      return
    }
    
    await firestore().collection('restaurant_orders').doc(order.id).update({
      status: 'Order Accepted',
      // driver,
      // driverID: driver.id,
    })
    
    const notify = functions().httpsCallable('sendPushNofications')
    await notify({
      data: {
        toUserID:  "5FG2G0svoSaE58pKGDTXpB2GD5D3",
        titleStr: 'Order Accepted',
        contentStr: 'Driver accepted order',
        type: 'notifications',
        orderID: order.id,
      },
    }).catch(error => {
      console.log('Push notification error:', error)
    })
    
    // firestore()
    //   .collection(config.FIREBASE_COLLECTIONS.USERS)
    //   .doc(driver.id)
    //   .update({
    //     orderRequestData: null,
    //     inProgressOrderID: order.id,
    //   })
  } catch (error) {
    console.log('Accept order error:', error)
    throw error
  }
}

export const updateStatus = async (config, order, driver) => {
  try {
    if (!driver || !driver.id || driver.id.length === 0) {
      return
    }
    if (!order || !order.id || order.id.length === 0) {
      return
    }
    
    await firestore().collection('restaurant_orders').doc(order.id).update({
      status: 'In Transit',
    })
  } catch (error) {
    console.log('Update status error:', error)
    throw error
  }
}

export const reject = async (config, order, driver) => {
  try {
    if (!driver || !driver.id || driver.id.length === 0) {
      return
    }
    if (!order || !order.id || order.id.length === 0) {
      return
    }

    var rejectedByDrivers = order.rejectedByDrivers ? order.rejectedByDrivers : []
    rejectedByDrivers.push(driver.id)

    // firestore()
    //   .collection(config.FIREBASE_COLLECTIONS.USERS)
    //   .doc(driver.id)
    //   .update({ orderRequestData: null })

    await firestore().collection('restaurant_orders').doc(order.id).update({
      status: 'Driver Rejected',
      rejectedByDrivers: rejectedByDrivers,
    })
  } catch (error) {
    console.log('Reject order error:', error)
    throw error
  }
}

export const onDelete = async (config, orderID) => {
  try {
    if (!orderID || orderID.length === 0) {
      return
    }

    await firestore()
      .collection(config.FIREBASE_COLLECTIONS.ORDERS)
      .doc(orderID)
      .delete()
    
    console.log('Order deleted successfully:', orderID)
  } catch (error) {
    console.log('Delete order error:', error)
    throw error
  }
}

export const markAsPickedUp = async (config, order) => {
  try {
    if (!order || !order.id || order.id.length === 0) {
      return
    }

    await firestore()
      .collection(config.FIREBASE_COLLECTIONS.ORDERS)
      .doc(order.id)
      .update({ status: 'In Transit' })
    
    console.log('Order marked as picked up:', order.id)
  } catch (error) {
    console.log('Mark as picked up error:', error)
    throw error
  }
}

export const markAsCompleted = async (config, order, driver) => {
  try {
    if (!order || !order.id || order.id.length === 0) {
      return
    }
    if (!driver || !driver.id || driver.id.length === 0) {
      return
    }

    // Update order status
    await firestore()
      .collection(config.FIREBASE_COLLECTIONS.ORDERS)
      .doc(order.id)
      .update({ status: 'Order Completed' })

    // Update driver status
    await firestore()
      .collection(config.FIREBASE_COLLECTIONS.USERS)
      .doc(driver.id)
      .update({ inProgressOrderID: null, orderRequestData: null })
    
    console.log('Order marked as completed:', order.id)
  } catch (error) {
    console.log('Mark as completed error:', error)
    throw error
  }
}
