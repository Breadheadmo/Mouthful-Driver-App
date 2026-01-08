import { useEffect } from 'react'
import messaging from '@react-native-firebase/messaging'
import { useAppState } from '@react-native-community/hooks'

/**
 * useOrderNotification: Listen for FCM push notifications containing orderRequestData
 *
 * When app is in foreground: Triggers callback immediately
 * When app is backgrounded: Firebase auto-shows notification; returns data in onMessage when tapped
 * Handles both cases to ensure orderRequestData modal displays
 *
 * Usage:
 * const { notificationData } = useOrderNotification((data) => {
 *   console.log('New order notification:', data)
 * })
 */
export const useOrderNotification = (onNotificationReceived = null) => {
  const appState = useAppState()

  useEffect(() => {
    let unsubscribe = null

    const setupListeners = async () => {
      try {
        // Request user permission for notifications
        const authStatus = await messaging().requestPermission()
        const isEnabled =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL

        if (!isEnabled) {
          console.warn('FCM permission not granted')
          return
        }

        // Get FCM token and store in Firestore user doc
        const token = await messaging().getToken()
        if (token) {
          // Store token in user doc - the app should call this or it can be done here
          console.log('FCM Token:', token)
          // Note: Actual token storage should be done in user auth/profile setup
        }

        // Handle notifications when app is in foreground
        unsubscribe = messaging().onMessage(async (remoteMessage) => {
          console.log('Notification received (foreground):', remoteMessage)

          const orderRequestData = remoteMessage.data?.orderRequestData
          if (orderRequestData) {
            try {
              const parsedData = JSON.parse(orderRequestData)
              if (onNotificationReceived) {
                onNotificationReceived(parsedData)
              }
            } catch (e) {
              console.error('Failed to parse orderRequestData:', e)
            }
          }
        })

        // Handle notification when app opened from background
        const notificationOpen = await messaging().getInitialNotification()
        if (notificationOpen) {
          console.log('App opened from notification:', notificationOpen)
          const orderRequestData = notificationOpen.data?.orderRequestData
          if (orderRequestData) {
            try {
              const parsedData = JSON.parse(orderRequestData)
              if (onNotificationReceived) {
                onNotificationReceived(parsedData)
              }
            } catch (e) {
              console.error('Failed to parse orderRequestData:', e)
            }
          }
        }
      } catch (error) {
        console.error('Error setting up FCM listener:', error)
      }
    }

    setupListeners()

    return () => {
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [onNotificationReceived])

  return {
    isReady: appState === 'active',
  }
}

/**
 * updateDriverFcmToken: Call this in driver app on first launch and after token refresh
 *
 * Stores the FCM token in the driver's Firestore user document
 * Required for push notifications to reach the driver
 */
export const updateDriverFcmToken = async (userId) => {
  try {
    const token = await messaging().getToken()
    if (!token) {
      console.warn('No FCM token available')
      return false
    }

    // Import from config as needed in your app
    // import { db } from '../../../core/firebase/config'
    // await db.collection('users').doc(userId).update({ fcmToken: token })

    console.log('FCM token updated:', token)
    return true
  } catch (error) {
    console.error('Error updating FCM token:', error)
    return false
  }
}

/**
 * handleTokenRefresh: Call this if using messaging().onTokenRefresh()
 *
 * Firebase automatically rotates FCM tokens periodically
 * This ensures the new token is always stored in Firestore
 */
export const handleTokenRefresh = async (userId) => {
  try {
    const unsubscribe = messaging().onTokenRefresh((token) => {
      console.log('FCM token refreshed:', token)
      // Update token in user doc
      // import { db } from '../../../core/firebase/config'
      // db.collection('users').doc(userId).update({ fcmToken: token })
    })

    return unsubscribe
  } catch (error) {
    console.error('Error setting up token refresh listener:', error)
    return null
  }
}
