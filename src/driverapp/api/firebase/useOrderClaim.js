import { useState, useCallback } from 'react'
import { functions } from '../../../core/firebase/config'
import { mockClaimOrder, mockRejectOrder } from '../../../core/firebase/mockFunctions'

// Toggle this flag to use mock functions during development without Blaze plan
// Set to false when Cloud Functions are deployed
const USE_MOCK_FUNCTIONS = true

const useOrderClaim = () => {
  const [claimLoading, setClaimLoading] = useState(false)
  const [claimError, setClaimError] = useState(null)

  /**
   * Claim an order (atomic server-side transaction)
   * @param {string} orderId 
   * @returns {Promise} { success, message, alreadyTaken }
   */
  const claimOrder = useCallback(async (orderId) => {
    if (!orderId) {
      setClaimError('Order ID is required')
      return { success: false, message: 'Order ID is required' }
    }

    setClaimLoading(true)
    setClaimError(null)

    try {
      let response
      
      if (USE_MOCK_FUNCTIONS) {
        // Use mock during development
        response = await mockClaimOrder(orderId)
      } else {
        // Real Cloud Function call (requires Blaze plan)
        const callable = functions().httpsCallable('claimOrder')
        response = await callable({ orderId })
      }
      
      setClaimLoading(false)
      
      // Handle responses from Cloud Function
      if (response.data?.success) {
        return { success: true, message: 'Order claimed successfully' }
      } else if (response.data?.alreadyTaken) {
        setClaimError('Order already taken by another driver')
        return { success: false, alreadyTaken: true, message: 'Order already taken' }
      } else {
        setClaimError(response.data?.message || 'Failed to claim order')
        return { success: false, message: response.data?.message || 'Failed to claim order' }
      }
    } catch (error) {
      setClaimLoading(false)
      
      let errorMessage = 'Failed to claim order'
      if (error.code === 'unauthenticated') {
        errorMessage = 'You must be logged in to accept orders'
      } else if (error.code === 'permission-denied') {
        errorMessage = 'You do not have permission to claim this order'
      } else if (error.code === 'deadline-exceeded') {
        errorMessage = 'Request timed out. Please try again.'
      } else if (error.code === 'unavailable') {
        errorMessage = 'Service unavailable. Please try again.'
      }
      
      setClaimError(errorMessage)
      console.error('Claim order error:', error)
      return { success: false, message: errorMessage, offline: error.code === 'unavailable' }
    }
  }, [])

  /**
   * Reject an order (atomic server-side transaction)
   * @param {string} orderId 
   * @returns {Promise} { success, message }
   */
  const rejectOrder = useCallback(async (orderId) => {
    if (!orderId) {
      setClaimError('Order ID is required')
      return { success: false, message: 'Order ID is required' }
    }

    setClaimLoading(true)
    setClaimError(null)

    try {
      let response
      
      if (USE_MOCK_FUNCTIONS) {
        // Use mock during development
        response = await mockRejectOrder(orderId)
      } else {
        // Real Cloud Function call (requires Blaze plan)
        const callable = functions().httpsCallable('rejectOrder')
        response = await callable({ orderId })
      }
      
      setClaimLoading(false)
      
      if (response.data?.success) {
        return { success: true, message: 'Order rejected' }
      } else {
        setClaimError(response.data?.message || 'Failed to reject order')
        return { success: false, message: response.data?.message || 'Failed to reject order' }
      }
    } catch (error) {
      setClaimLoading(false)
      
      let errorMessage = 'Failed to reject order'
      if (error.code === 'unauthenticated') {
        errorMessage = 'You must be logged in'
      } else if (error.code === 'deadline-exceeded') {
        errorMessage = 'Request timed out'
      }
      
      setClaimError(errorMessage)
      console.error('Reject order error:', error)
      return { success: false, message: errorMessage }
    }
  }, [])

  return {
    claimOrder,
    rejectOrder,
    claimLoading,
    claimError,
  }
}

export default useOrderClaim
