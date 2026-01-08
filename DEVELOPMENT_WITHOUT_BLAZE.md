# Development Without Blaze Plan - Alternative Approach

Since Firebase Emulators require Java 21, here's an alternative approach to continue development:

## Option 1: Mock Cloud Functions (Recommended for UI Development)

Create mock implementations that simulate Cloud Function responses.

### Create Mock Functions File

File: `src/core/firebase/mockFunctions.js`

```javascript
// Mock Cloud Functions for development without Blaze plan
export const mockClaimOrder = async (orderId) => {
  console.log('[MOCK] claimOrder called:', orderId)
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500))
  
  // Simulate successful claim
  return {
    data: {
      success: true,
      message: 'Order claimed successfully (MOCK)'
    }
  }
  
  // To test "already taken" scenario:
  // return {
  //   data: {
  //     success: false,
  //     alreadyTaken: true,
  //     message: 'Order was taken by another driver (MOCK)'
  //   }
  // }
}

export const mockRejectOrder = async (orderId) => {
  console.log('[MOCK] rejectOrder called:', orderId)
  
  await new Promise(resolve => setTimeout(resolve, 300))
  
  return {
    data: {
      success: true,
      message: 'Order rejected successfully (MOCK)'
    }
  }
}
```

### Update useOrderClaim Hook

File: `src/driverapp/api/firebase/useOrderClaim.js`

Add at the top:
```javascript
import { mockClaimOrder, mockRejectOrder } from '../../../core/firebase/mockFunctions'

const USE_MOCK_FUNCTIONS = true // Set to false when Blaze plan activated
```

In the claimOrder function, replace the callable call:
```javascript
const claimOrder = async (orderId) => {
  try {
    setClaimLoading(true)
    setClaimError(null)

    // Use mock for development
    if (USE_MOCK_FUNCTIONS) {
      const result = await mockClaimOrder(orderId)
      return result.data
    }

    // Real Cloud Function call (requires Blaze plan)
    const callable = functions().httpsCallable('claimOrder')
    const result = await callable({ orderId })
    return result.data
  } catch (error) {
    // ... rest of error handling
  }
}
```

## Option 2: Client-Side Temporary Implementation

⚠️ **NOT RECOMMENDED FOR PRODUCTION** - Use only for UI testing

You can implement claim/reject logic directly in the client, then replace with Cloud Functions later:

```javascript
// Temporary client-side claim (INSECURE - for development only)
const claimOrder = async (orderId) => {
  try {
    const orderRef = db.collection('restaurant_orders').doc(orderId)
    const driverId = auth().currentUser.uid
    
    await orderRef.update({
      status: 'Driver Assigned',
      assignedDriverId: driverId,
      claimedAt: new Date().toISOString()
    })
    
    // Clear orderRequestData
    await db.collection('users').doc(driverId).update({
      orderRequestData: null
    })
    
    return { success: true }
  } catch (error) {
    console.error('Client-side claim error:', error)
    return { success: false, message: error.message }
  }
}
```

## Option 3: Use Production Firebase (Current Setup)

Your Firestore rules are already deployed. You can:

1. ✅ Test all UI components (modal, countdown, error handling)
2. ✅ Test real-time listeners (useDriverRequest)
3. ✅ Test FCM setup (token management)
4. ❌ Cloud Functions will fail (expected - no Blaze plan)

**What Works:**
- Driver receives orderRequestData → Modal shows
- Countdown timer works
- Reject button works (with mock)
- Accept button shows error (expected until Blaze plan)

**When to Upgrade:**
- When you need to test actual claim/reject with atomic transactions
- When multiple drivers need to test race conditions
- When ready for production deployment

## Quick Setup: Option 1 (Mocks)

1. **Create mock functions file:**
   ```bash
   # File already in guide above
   ```

2. **Update useOrderClaim.js:**
   Add the USE_MOCK_FUNCTIONS flag and conditional logic

3. **Test the flow:**
   - Create test order in Firestore Console
   - Add orderRequestData to test driver
   - Accept/Reject in app → See mock responses

## What You Can Test Right Now

✅ **UI/UX Flow**
- Modal display with order details
- 30-second countdown timer
- Accept/Reject button interactions
- Loading states
- Error message display

✅ **Real-Time Updates**
- useDriverRequest listener
- orderRequestData changes
- Full order fetching
- Modal auto-close on clear

✅ **Error Scenarios**
- Network errors (airplane mode)
- Timeout auto-reject
- Already-taken alerts (with mocks)
- Retry flows

❌ **Cannot Test Without Blaze**
- Actual atomic claim transactions
- Multi-driver race conditions
- Server-side security enforcement
- Cloud Function error codes

## Cost of Blaze Plan

**Free Tier (included):**
- 2M Cloud Function invocations/month
- 125K function-seconds/month
- 10GB outbound network

**Typical Cost for Your App:**
- ~$0-5/month for development
- ~$10-30/month for small production (100-500 drivers)

**Recommendation:** Upgrade to Blaze when ready for integration testing or production.

## Next Steps

**For Now (No Blaze):**
```bash
1. Create mockFunctions.js
2. Update useOrderClaim with USE_MOCK_FUNCTIONS flag
3. Test UI/UX flows
4. Build confidence in your implementation
```

**When Ready (Blaze Activated):**
```bash
1. Set USE_MOCK_FUNCTIONS = false
2. Deploy Cloud Functions: firebase deploy --only functions
3. Test with real atomic transactions
4. Deploy to production
```

You can continue development with full UI/UX testing using mocks! 🎉
