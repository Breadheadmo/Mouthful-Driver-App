import { useState, useEffect } from 'react'
import { subscribeToDriver as subscribeToDriverAPI } from './FirebaseDriverClient'
import firestore from '@react-native-firebase/firestore'

const useDriverRequest = (config, driverID) => {
  const [updatedDriver, setUpdateDriverInfo] = useState()
  const [orderRequest, setOrderRequest] = useState(null)
  const [requestLoading, setRequestLoading] = useState(false)

  useEffect(() => {
    if (!driverID) {
      return
    }
    const unsubcribeToDriver = subscribeToDriverAPI(
      config,
      driverID,
      onOrderRequestUpdate,
    )
    return unsubcribeToDriver
  }, [driverID, config])

  const onOrderRequestUpdate = async data => {
    setUpdateDriverInfo(data)
    
    // If orderRequestData exists, fetch full order details
    if (data?.orderRequestData?.orderId) {
      setRequestLoading(true)
      try {
        const orderSnap = await firestore()
          .collection(config.FIREBASE_COLLECTIONS.ORDERS)
          .doc(data.orderRequestData.orderId)
          .get()
        
        if (orderSnap.exists) {
          const fullOrder = orderSnap.data()
          setOrderRequest({
            requestData: data.orderRequestData, // Reference: { orderId, assignedAt, estimatedDistance, estimatedTime }
            order: fullOrder, // Full order object: products, address, author, etc.
          })
        } else {
          console.warn('Order not found:', data.orderRequestData.orderId)
          setOrderRequest(null)
        }
      } catch (error) {
        console.error('Failed to fetch order details:', error)
        setOrderRequest(null)
      } finally {
        setRequestLoading(false)
      }
    } else {
      // No orderRequestData, clear the request
      setOrderRequest(null)
    }
  }

  return {
    orderRequest, // { requestData, order } or null
    requestLoading,
    inProgressOrderID: updatedDriver?.inProgressOrderID,
    updatedDriver,
  }
}

export default useDriverRequest
