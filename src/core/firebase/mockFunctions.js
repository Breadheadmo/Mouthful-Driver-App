// Mock Cloud Functions for development without Blaze plan
// These simulate the server-side Cloud Functions locally

/**
 * mockClaimOrder - Simulates the claimOrder Cloud Function
 * 
 * Use this during development to test the UI flow without deploying to Firebase
 * Set USE_MOCK_FUNCTIONS = false when Blaze plan is activated
 */
export const mockClaimOrder = async (orderId) => {
  console.log('[MOCK claimOrder] Called for order:', orderId)
  
  // Simulate network delay (300-800ms)
  const delay = 300 + Math.random() * 500
  await new Promise(resolve => setTimeout(resolve, delay))
  
  // Simulate different scenarios:
  const scenario = 'success' // Change to 'alreadyTaken', 'error', or 'timeout' to test
  
  switch (scenario) {
    case 'success':
      console.log('[MOCK claimOrder] ✅ Success - Order claimed')
      return {
        data: {
          success: true,
          message: 'Order claimed successfully (MOCK MODE)'
        }
      }
    
    case 'alreadyTaken':
      console.log('[MOCK claimOrder] ⚠️ Already Taken')
      return {
        data: {
          success: false,
          alreadyTaken: true,
          message: 'Order was taken by another driver (MOCK MODE)'
        }
      }
    
    case 'error':
      console.log('[MOCK claimOrder] ❌ Error')
      throw {
        code: 'permission-denied',
        message: 'Simulated permission error (MOCK MODE)'
      }
    
    case 'timeout':
      console.log('[MOCK claimOrder] ⏱️ Timeout')
      throw {
        code: 'deadline-exceeded',
        message: 'Simulated timeout error (MOCK MODE)'
      }
    
    default:
      return {
        data: {
          success: true,
          message: 'Order claimed (MOCK MODE)'
        }
      }
  }
}

/**
 * mockRejectOrder - Simulates the rejectOrder Cloud Function
 */
export const mockRejectOrder = async (orderId) => {
  console.log('[MOCK rejectOrder] Called for order:', orderId)
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 200))
  
  console.log('[MOCK rejectOrder] ✅ Order rejected')
  return {
    data: {
      success: true,
      message: 'Order rejected successfully (MOCK MODE)'
    }
  }
}

/**
 * Test Scenarios:
 * 
 * To test different outcomes, change the `scenario` variable in mockClaimOrder:
 * 
 * 'success' → Order claimed successfully
 * 'alreadyTaken' → Another driver claimed first
 * 'error' → Permission denied error
 * 'timeout' → Request timeout error
 */
