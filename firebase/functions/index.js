const functions = require('firebase-functions')
const admin = require('firebase-admin')

admin.initializeApp()

const db = admin.firestore()

/**
 * claimOrder: Atomic callable to claim an order by a driver
 *
 * Input: { orderId: string }
 * Returns: { success: boolean, alreadyTaken?: boolean, message?: string }
 *
 * Server-side atomic transaction ensuring only one driver can claim the order.
 * On success:
 *   - Set driver's status to "Accepted" in assignedDrivers array
 *   - Set other drivers' status to "Rejected"
 *   - Set order.status to "Driver Assigned"
 *   - Clear orderRequestData for all other drivers
 * On failure (already claimed):
 *   - Return { alreadyTaken: true } if another driver claimed it first
 */
exports.claimOrder = functions.https.onCall(async (data, context) => {
  try {
    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'You must be authenticated to claim an order'
      )
    }

    const driverId = context.auth.uid
    const { orderId } = data

    if (!orderId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'orderId is required'
      )
    }

    // Atomic transaction
    const result = await db.runTransaction(async (transaction) => {
      // Fetch order
      const orderRef = db.collection('restaurant_orders').doc(orderId)
      const orderSnap = await transaction.get(orderRef)

      if (!orderSnap.exists) {
        throw new functions.https.HttpsError(
          'not-found',
          'Order not found'
        )
      }

      const order = orderSnap.data()
      const assignedDrivers = order.assignedDrivers || []

      // Check if order already accepted
      const alreadyAccepted = assignedDrivers.some(
        (d) => d.status === 'Accepted'
      )
      if (alreadyAccepted) {
        return { success: false, alreadyTaken: true }
      }

      // Check if current driver is in assignedDrivers
      const driverIndex = assignedDrivers.findIndex(
        (d) => d.driverId === driverId
      )
      if (driverIndex === -1) {
        throw new functions.https.HttpsError(
          'permission-denied',
          'Driver not in assigned list'
        )
      }

      // Mark current driver as "Accepted"
      assignedDrivers[driverIndex].status = 'Accepted'
      assignedDrivers[driverIndex].acceptedAt = admin.firestore.FieldValue.serverTimestamp()

      // Mark other drivers as "Rejected" and clear their orderRequestData
      const otherDriverIds = assignedDrivers
        .filter((d, idx) => idx !== driverIndex)
        .map((d) => d.driverId)

      for (let i = 0; i < assignedDrivers.length; i++) {
        if (i !== driverIndex) {
          assignedDrivers[i].status = 'Rejected'
          assignedDrivers[i].rejectedAt = admin.firestore.FieldValue.serverTimestamp()
        }
      }

      // Update order
      transaction.update(orderRef, {
        assignedDrivers,
        status: 'Driver Assigned',
        assignedDriverId: driverId,
        claimedAt: admin.firestore.FieldValue.serverTimestamp(),
      })

      // Clear orderRequestData for other drivers
      for (const otherId of otherDriverIds) {
        const userRef = db.collection('users').doc(otherId)
        transaction.update(userRef, {
          orderRequestData: admin.firestore.FieldValue.delete(),
        })
      }

      return { success: true }
    })

    return result
  } catch (error) {
    console.error('claimOrder error:', error)

    if (error instanceof functions.https.HttpsError) {
      throw error
    }

    throw new functions.https.HttpsError(
      'internal',
      `Failed to claim order: ${error.message}`
    )
  }
})

/**
 * rejectOrder: Callable for driver to reject an assigned order
 *
 * Input: { orderId: string }
 * Returns: { success: boolean, message?: string }
 *
 * Server-side operation:
 *   - Mark driver's status as "Rejected" in assignedDrivers
 *   - Clear driver's orderRequestData
 *   - If all drivers rejected, set order.status to "Reassign Needed"
 */
exports.rejectOrder = functions.https.onCall(async (data, context) => {
  try {
    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'You must be authenticated to reject an order'
      )
    }

    const driverId = context.auth.uid
    const { orderId } = data

    if (!orderId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'orderId is required'
      )
    }

    // Atomic transaction
    await db.runTransaction(async (transaction) => {
      // Fetch order
      const orderRef = db.collection('restaurant_orders').doc(orderId)
      const orderSnap = await transaction.get(orderRef)

      if (!orderSnap.exists) {
        throw new functions.https.HttpsError(
          'not-found',
          'Order not found'
        )
      }

      const order = orderSnap.data()
      const assignedDrivers = order.assignedDrivers || []

      // Find and mark current driver as rejected
      let driverFound = false
      for (let i = 0; i < assignedDrivers.length; i++) {
        if (assignedDrivers[i].driverId === driverId) {
          assignedDrivers[i].status = 'Rejected'
          assignedDrivers[i].rejectedAt = admin.firestore.FieldValue.serverTimestamp()
          driverFound = true
          break
        }
      }

      if (!driverFound) {
        throw new functions.https.HttpsError(
          'permission-denied',
          'Driver not in assigned list'
        )
      }

      // Check if all drivers have rejected
      const allRejected = assignedDrivers.every((d) => d.status === 'Rejected')
      const updateData = {
        assignedDrivers,
      }
      if (allRejected) {
        updateData.status = 'Reassign Needed'
      }

      // Update order
      transaction.update(orderRef, updateData)

      // Clear driver's orderRequestData
      const userRef = db.collection('users').doc(driverId)
      transaction.update(userRef, {
        orderRequestData: admin.firestore.FieldValue.delete(),
      })
    })

    return { success: true }
  } catch (error) {
    console.error('rejectOrder error:', error)

    if (error instanceof functions.https.HttpsError) {
      throw error
    }

    throw new functions.https.HttpsError(
      'internal',
      `Failed to reject order: ${error.message}`
    )
  }
})

/**
 * notifyDriversOfNewOrder: Background trigger to send push notifications to assigned drivers
 * (Alternative: Admin can call this from web dashboard when assigning drivers)
 *
 * Triggered on: restaurant_orders/{orderId} status change to "Driver Assignment Pending"
 * Sends: Push notification to top 3 nearest drivers with order summary
 *
 * NOTE: This is optional - admin typically sends notifications via separate endpoint
 * Keeping as comment for reference
 */
// Uncomment if using Firestore triggers for notifications
// exports.notifyDriversOfNewOrder = onDocumentUpdated(
//   'restaurant_orders/{orderId}',
//   async (event) => {
//     const before = event.data.before.data()
//     const after = event.data.after.data()
//     const orderId = event.params.orderId

//     try {
//       if (before.status === after.status || after.status !== 'Driver Assignment Pending') {
//         return
//       }

//       const assignedDrivers = after.assignedDrivers || []
//       if (assignedDrivers.length === 0) {
//         return
//       }

//       const notificationPromises = assignedDrivers.map(async (driver) => {
//         try {
//           const userSnap = await db.collection('users').doc(driver.driverId).get()
//           if (!userSnap.exists) return
//           const user = userSnap.data()
//           const fcmToken = user.fcmToken
//           if (!fcmToken) return

//           const payload = {
//             notification: {
//               title: 'New Delivery Order',
//               body: `${after.restaurantName || 'Order'} • ${after.estimatedDistance || '?'} km away`,
//             },
//             data: {
//               orderId: orderId,
//               orderRequestData: JSON.stringify({
//                 orderId: orderId,
//                 assignedAt: new Date().toISOString(),
//                 estimatedDistance: after.estimatedDistance || '0',
//                 estimatedTime: after.estimatedTime || '0',
//               }),
//             },
//           }

//           await admin.messaging().sendToDevice(fcmToken, payload)
//         } catch (err) {
//           console.error('Error notifying driver:', err)
//         }
//       })

//       await Promise.all(notificationPromises)
//     } catch (error) {
//       console.error('notifyDriversOfNewOrder error:', error)
//     }
//   }
// )
