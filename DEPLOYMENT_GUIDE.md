# Deployment & Setup Guide

## Pre-Deployment Checklist

### Code Review
- [ ] All functions have JSDoc comments
- [ ] No console.log in production code (use proper logging)
- [ ] All error cases handled
- [ ] Memory leaks prevented (timers cleaned up)
- [ ] No hardcoded values (use config)

### Testing
- [ ] Unit tests pass: `npm test -- componentTests`
- [ ] Integration tests pass: `npm test -- integrationTests`
- [ ] Manual QA checklist completed
- [ ] Edge cases tested (offline, timeout, race conditions)

## Cloud Functions Deployment

### 1. Set Up Firebase Functions Project

If you don't have a functions directory:

```bash
cd firebase
firebase init functions
# Choose: TypeScript (recommended) or JavaScript
# Install dependencies
```

### 2. Deploy Functions

```bash
# From project root
firebase deploy --only functions

# Deploy specific function
firebase deploy --only functions:claimOrder

# View deployment status
firebase functions:log
```

### 3. Verify Deployment

```bash
# Test callable from emulator (if using emulator)
firebase emulators:start --only functions,firestore

# Or test from command line
curl -X POST https://us-central1-YOUR_PROJECT.cloudfunctions.net/claimOrder \
  -H "Content-Type: application/json" \
  -d '{"orderId":"test-123"}'
```

## Firestore Security Rules Deployment

### 1. Deploy Rules

```bash
firebase deploy --only firestore:rules
```

### 2. Test Rules

```bash
# From Firebase Console:
# 1. Go to Firestore → Rules
# 2. Click "Rules Playground"
# 3. Test read/write permissions:

# Test: Driver can read own user doc
path: /users/driver-123
auth: uid: "driver-123"
Request: GET /users/driver-123
Expected: Allow

# Test: Driver cannot read another driver doc
path: /users/driver-456
auth: uid: "driver-123"
Request: GET /users/driver-456
Expected: Deny

# Test: Driver cannot write to order status
path: /restaurant_orders/order-123
auth: uid: "driver-123"
Request: SET /restaurant_orders/order-123 {status: "Hacked"}
Expected: Deny
```

## Driver App Updates

### 1. Update Imports

Add to `src/driverapp/api/index.js`:

```javascript
export {
  useOrderNotification,
  updateDriverFcmToken,
  handleTokenRefresh,
} from './firebase/useOrderNotification'
```

### 2. Integrate FCM in Driver Auth Flow

In driver login/signup flow, after authentication:

```javascript
import { updateDriverFcmToken } from '@driverapp/api'

// After user logs in
await updateDriverFcmToken(currentUser.id)
```

### 3. Enable Push Notifications in Manifest

**Android (`android/app/build.gradle`):**

```gradle
dependencies {
  // FCM already included via react-native-firebase
  implementation 'com.google.firebase:firebase-messaging:21.1.0'
}
```

**iOS (`ios/Podfile`):**

```ruby
target 'Instamobile' do
  pod 'Firebase/Messaging'
  # ... other pods
end
```

### 4. Update HomeScreen

Already completed! The HomeScreen now:
- Sets up FCM listeners on mount
- Listens for order notifications
- Updates FCM token

## Configuration

### Environment Variables

Create `.env` file in project root:

```bash
# Firebase Project
FIREBASE_PROJECT_ID=development-69cdc
FIREBASE_API_KEY=AIzaSy...

# Cloud Functions
FUNCTIONS_REGION=us-central1
FUNCTIONS_TIMEOUT_MS=540000  # 9 minutes

# Driver App
MODAL_TIMEOUT_MS=30000  # 30 seconds
MAX_RETRY_ATTEMPTS=3
RETRY_DELAY_MS=2000
```

### Order Status Configuration

In `src/config/driverAppConfig.js`:

```javascript
export const ORDER_STATUSES = {
  SUBMITTED: 'Submitted',
  CONFIRMED: 'Confirmed',
  DRIVER_ASSIGNMENT_PENDING: 'Driver Assignment Pending',
  DRIVER_ASSIGNED: 'Driver Assigned',
  IN_TRANSIT: 'In Transit',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  REASSIGN_NEEDED: 'Reassign Needed',
}

export const DRIVER_ASSIGNMENT_STATUSES = {
  PENDING: 'Pending',
  ACCEPTED: 'Accepted',
  REJECTED: 'Rejected',
}

export const MODAL_TIMEOUT_MS = 30000  // 30 seconds
export const AUTO_REJECT_TIMEOUT_MS = 30000
```

## Monitoring & Logging

### Cloud Functions Logging

Add to `firebase/functions/index.js`:

```javascript
const logger = require('firebase-functions/logger')

exports.claimOrder = functions.https.onCall(async (data, context) => {
  logger.info('claimOrder called', {
    driverId: context.auth.uid,
    orderId: data.orderId,
  })
  
  try {
    // ... claim logic
    logger.info('claimOrder success', { orderId: data.orderId })
  } catch (error) {
    logger.error('claimOrder failed', {
      orderId: data.orderId,
      error: error.message,
    })
  }
})
```

View logs:
```bash
firebase functions:log --limit=50
```

### Client-Side Logging

In driver app components:

```javascript
// useOrderClaim.js
const claimOrder = async (orderId) => {
  console.log('[claimOrder] Starting claim for order:', orderId)
  try {
    const result = await callable({ orderId })
    console.log('[claimOrder] Success:', result.data)
    return result.data
  } catch (error) {
    console.error('[claimOrder] Error:', error.code, error.message)
    throw error
  }
}
```

Use remote logging (Sentry, Firebase Crashlytics) for production:

```javascript
import * as Sentry from '@sentry/react-native'

try {
  await claimOrder(orderId)
} catch (error) {
  Sentry.captureException(error)
}
```

### Performance Monitoring

Enable Firebase Performance Monitoring:

```javascript
import perf from '@react-native-firebase/perf'

const trace = await perf().startTrace('claim_order_flow')
try {
  await claimOrder(orderId)
} finally {
  await trace.stop()
}
```

## Troubleshooting

### Issue: Modal Not Showing

**Checks:**
1. Verify `orderRequest` is populated in `useDriverRequest`
   - Check Firestore: `users/{driverId}.orderRequestData` exists
   - Check loading state: `requestLoading` should be false before modal shows
   
2. Verify `isVisible={!!orderRequest}` condition
   - Should be true when orderRequest has value
   
3. Check console for errors in `useDriverRequest` or `useOrderClaim`

**Solution:**
```javascript
// Add debug logging in HomeScreen
useEffect(() => {
  console.log('[HomeScreen] orderRequest:', orderRequest)
  console.log('[HomeScreen] requestLoading:', requestLoading)
}, [orderRequest, requestLoading])
```

### Issue: Claim Fails with "Already Taken"

**Expected Behavior:**
- If another driver claimed first, you should see this error
- This is normal and expected in race conditions

**Solution:**
- Show retry button (already implemented)
- Automatically hide modal after 3 seconds
- Consider declining modal after "already taken" to show updated order list

### Issue: Timeout Not Firing

**Checks:**
1. Verify `MODAL_TIMEOUT_MS = 30000` is set correctly
2. Verify `useEffect` with `setInterval` is running
3. Check browser console for timer logs

**Solution:**
```javascript
// Add debug logging in NewOrderRequestModal
useEffect(() => {
  const interval = setInterval(() => {
    setTimeLeft((prev) => {
      console.log('[Modal] Time left:', prev)
      return prev - 1
    })
  }, 1000)
  
  const timeout = setTimeout(() => {
    console.log('[Modal] Timeout fired, auto-rejecting')
    // ... auto-reject logic
  }, MODAL_TIMEOUT_MS)
  
  return () => {
    clearInterval(interval)
    clearTimeout(timeout)
  }
}, [])
```

### Issue: FCM Token Not Updating

**Checks:**
1. Verify permission granted: `requestPermission()` returned "authorized"
2. Verify token obtained: `getToken()` returned non-null value
3. Verify token saved to Firestore: Check `users/{driverId}.fcmToken`

**Solution:**
```javascript
// Add debug logging in useOrderNotification
const setupListeners = async () => {
  const authStatus = await messaging().requestPermission()
  console.log('[FCM] Auth status:', authStatus)
  
  const token = await messaging().getToken()
  console.log('[FCM] Token:', token)
  
  // Save to Firestore and verify
  await db.collection('users').doc(userId).update({ fcmToken: token })
  const userDoc = await db.collection('users').doc(userId).get()
  console.log('[FCM] Stored token:', userDoc.data().fcmToken)
}
```

### Issue: Race Condition Not Resolved

**Expected Behavior:**
- Only one driver should successfully claim
- Others should get `alreadyTaken: true`
- This is guaranteed by server-side atomic transaction

**Solution:**
- Verify Cloud Function `claimOrder` is deployed
- Test with actual Firebase Firestore (not emulator if it has issues)
- Check Cloud Functions logs for errors:
  ```bash
  firebase functions:log --limit=100 | grep claimOrder
  ```

### Issue: Security Rules Blocking Legitimate Access

**Checks:**
1. Verify driver is authenticated: `context.auth != null`
2. Verify driver is in `assignedDrivers`: 
   ```
   request.auth.uid in resource.data.assignedDrivers[*].driverId
   ```
3. Verify operation is allowed:
   - Drivers can read assigned orders
   - Drivers can update own user doc
   - Drivers cannot write to `status` or `assignedDrivers`

**Solution:**
Use Firebase Console Rules Playground to test:
```
// Simulate request
Auth: uid: "driver-123"
Operation: GET
Path: /restaurant_orders/order-123
Document data: {
  assignedDrivers: [
    { driverId: "driver-123", ... },
    { driverId: "driver-456", ... }
  ]
}
Expected: Allow (driver is in assignedDrivers)
```

## Rollback Plan

If something goes wrong post-deployment:

### Rollback Cloud Functions
```bash
# Revert to previous version
firebase deploy --only functions --force

# Or manually delete problematic function
firebase functions:delete claimOrder
```

### Rollback Security Rules
```bash
# Deploy more permissive rules temporarily
firebase deploy --only firestore:rules
```

### Rollback Driver App
```bash
# Revert to previous commit
git revert HEAD

# Rebuild and redeploy
npm run build
# Upload to app store
```

## Post-Deployment Validation

### 1. Test Basic Flow

```javascript
// Run from Firebase Console or command line
const order = {
  id: 'test-order-123',
  assignedDrivers: [
    { driverId: 'driver-111', status: 'Pending' }
  ]
}

// Create test order
await db.collection('restaurant_orders').doc('test-order-123').set(order)

// Simulate driver receiving notification
await db.collection('users').doc('driver-111').update({
  orderRequestData: {
    orderId: 'test-order-123',
    assignedAt: new Date().toISOString(),
  }
})

// Claim order
const result = await functions().httpsCallable('claimOrder')({
  orderId: 'test-order-123'
})

console.log('Claim result:', result.data)
// Expected: { success: true }
```

### 2. Monitor Key Metrics

- Claim success rate (should be >99%)
- Average claim latency (<2s)
- Modal timeout auto-reject count
- FCM delivery rate (>98%)
- Security rule rejection count (should be ~0 for legitimate operations)

### 3. Gather User Feedback

- Are drivers seeing orders in real-time?
- Is 30s timeout enough? (Adjust if <20% acceptance)
- Any network-related errors?
- Does retry work on network recovery?

## Next Steps

1. **Deploy Cloud Functions** (5 min)
   ```bash
   firebase deploy --only functions
   ```

2. **Deploy Security Rules** (2 min)
   ```bash
   firebase deploy --only firestore:rules
   ```

3. **Update Driver App** (10 min)
   - Pull latest code
   - Run tests
   - Build APK/IPA

4. **Internal Testing** (2 hours)
   - Test with 3 test accounts
   - Verify race conditions
   - Check FCM notifications
   - Validate timeout behavior

5. **Beta Release** (1 week)
   - Release to 10% of drivers
   - Monitor logs and metrics
   - Gather feedback

6. **Full Production Release**
   - Roll out to 100% of drivers
   - Monitor for issues
   - Have rollback plan ready

## Support & Maintenance

### Ongoing Monitoring
- Set up alerts for Cloud Functions errors
- Monitor Firestore read/write costs
- Track driver response times

### Future Improvements
- Add claim analytics dashboard
- Optimize notification timing
- A/B test timeout durations
- Implement driver preference settings
