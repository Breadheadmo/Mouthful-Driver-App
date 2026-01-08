# Driver Order Assignment System - Implementation Guide

## Overview

This document describes the atomic driver order assignment system with claim/reject functionality, timeouts, push notifications, and security rules.

## Architecture

### Data Flow

```
Admin Dashboard
    ↓
getNearestDrivers() → Top 3 drivers selected
    ↓
restaurant_orders/{orderId}.assignedDrivers = [Driver1, Driver2, Driver3]
restaurant_orders/{orderId}.status = "Driver Assignment Pending"
    ↓
Set users/{driverId}.orderRequestData for each driver (lightweight reference)
    ↓
Push notification via FCM with order summary
    ↓
Driver 1,2,3 receive notification → Modal displays with 30s countdown
    ↓
First to claim wins (atomic transaction in claimOrder CF)
    ↓
Winner: order.status = "Driver Assigned", orderRequestData cleared for losers
Losers: Receive "Order Taken" alert, orderRequestData cleared
```

## Components

### 1. Cloud Functions

**File:** `firebase/functions/index.js`

#### `claimOrder(orderId)`
- **Callable HTTPS Function**
- **Input:** `{ orderId: string }`
- **Output:** `{ success: boolean, alreadyTaken?: boolean, message?: string }`

**Logic:**
1. Verify auth via `context.auth.uid`
2. Fetch order from `restaurant_orders/{orderId}`
3. Check if already accepted (`assignedDrivers[].status === "Accepted"`)
4. If taken: Return `{ success: false, alreadyTaken: true }`
5. If available: Atomic transaction:
   - Mark caller's status → "Accepted"
   - Mark other drivers' status → "Rejected"
   - Set `order.status = "Driver Assigned"`
   - Set `order.assignedDriverId = driverId`
   - Set `order.claimedAt = serverTimestamp()`
   - Clear `users/{otherId}.orderRequestData` for all other drivers
6. Return `{ success: true }`

**Error Handling:**
- `unauthenticated`: User not logged in
- `permission-denied`: Driver not in assignedDrivers array
- `not-found`: Order doesn't exist
- `internal`: Unexpected error

#### `rejectOrder(orderId)`
- **Callable HTTPS Function**
- **Input:** `{ orderId: string }`
- **Output:** `{ success: boolean, message?: string }`

**Logic:**
1. Verify auth
2. Find driver in `assignedDrivers`
3. Mark driver's status → "Rejected"
4. Clear driver's `orderRequestData`
5. If all drivers rejected: Set `order.status = "Reassign Needed"`
6. Return `{ success: true }`

#### `notifyDriversOfNewOrder()` (Optional Trigger)
- **Firestore Document Trigger**
- **Trigger:** `restaurant_orders/{orderId}` when status changes to "Driver Assignment Pending"
- **Action:** Send FCM push notification to each assigned driver
- **Payload:**
  ```json
  {
    "notification": {
      "title": "New Delivery Order",
      "body": "Restaurant Name • 2.5 km away"
    },
    "data": {
      "orderId": "order-123",
      "orderRequestData": "{\"orderId\":\"order-123\",\"estimatedDistance\":\"2.5\",\"estimatedTime\":\"12 min\"}"
    }
  }
  ```

### 2. Driver App Hooks

#### `useDriverRequest(config, driverId)`

**File:** `src/driverapp/api/firebase/useDriverRequest.js`

- **Purpose:** Real-time listener for incoming order assignments
- **Returns:**
  ```javascript
  {
    orderRequest: {
      requestData: { orderId, assignedAt, estimatedDistance, estimatedTime },
      order: { id, restaurantName, products, address, author, status, ... }
    },
    requestLoading: boolean,
    inProgressOrderID?: string,
    updatedDriver?: object
  }
  ```
- **Behavior:**
  1. Listen to `users/{driverId}` changes via `onSnapshot`
  2. When `orderRequestData` arrives, fetch full order from `restaurant_orders/{orderId}`
  3. Set `requestLoading = true` during fetch
  4. Once order fetched, return full `orderRequest` object
  5. Clear on orderRequestData deletion (auto-clear by CF when order claimed by someone else)

#### `useOrderClaim()`

**File:** `src/driverapp/api/firebase/useOrderClaim.js`

- **Purpose:** Wrapper around `claimOrder` and `rejectOrder` Cloud Function callables
- **Returns:**
  ```javascript
  {
    claimOrder: (orderId) => Promise<{ success, alreadyTaken, message }>,
    rejectOrder: (orderId) => Promise<{ success, message }>,
    claimLoading: boolean,
    claimError: string | null,
    rejectLoading: boolean,
    rejectError: string | null
  }
  ```
- **Error Mapping:**
  - `unauthenticated` → "You must be logged in"
  - `permission-denied` → "Not authorized to claim this order"
  - `deadline-exceeded` → "Request timed out"
  - `unavailable` → "Service temporarily unavailable"
  - `internal` → "Failed to process request"

#### `useOrderNotification(onNotificationReceived?)`

**File:** `src/driverapp/api/firebase/useOrderNotification.js`

- **Purpose:** Listen for FCM push notifications
- **Features:**
  - Request notification permission on mount
  - Handle foreground notifications via `onMessage`
  - Handle background notification taps via `getInitialNotification`
  - Parse `orderRequestData` from notification data
- **Exported Utilities:**
  - `updateDriverFcmToken(userId)` - Store FCM token in Firestore
  - `handleTokenRefresh(userId)` - Listen for token refresh and update Firestore

### 3. UI Components

#### `NewOrderRequestModal`

**File:** `src/driverapp/components/NewOrderRequestModal/NewOrderRequestModal.js`

- **Props:**
  ```javascript
  {
    isVisible: boolean,
    orderRequest: {
      requestData: { orderId, estimatedDistance, estimatedTime },
      order: { restaurantName, products, address, ... }
    },
    requestLoading: boolean,
    onOrderAccepted: () => void,
    onOrderRejected: () => void,
    onModalHide: () => void
  }
  ```

- **Features:**
  - 30-second countdown timer (MODAL_TIMEOUT_MS = 30000)
  - Display order details:
    - Restaurant name
    - Item count
    - Pickup/delivery address
    - Estimated distance
    - Estimated time
  - Two buttons: "Accept" and "Reject"
  - Loading state during claim/reject operations
  - Error alerts with retry option
  - Auto-reject timeout (calls `rejectOrder` when timer reaches 0)
  - Clears timers on unmount (no memory leaks)

- **State Management:**
  ```javascript
  const [timeLeft, setTimeLeft] = useState(30)
  const [claimLoading, setClaimLoading] = useState(false)
  const [claimError, setClaimError] = useState(null)
  ```

- **Effects:**
  1. `useEffect` → Setup countdown timer (setInterval)
  2. `useEffect` → Setup auto-reject timeout (setTimeout)
  3. `useEffect` → Cleanup timers on unmount
  4. `handleAccept` → Call `claimOrder`, handle success/error
  5. `handleReject` → Call `rejectOrder`, clear timers

### 4. Firestore Security Rules

**File:** `firebase/firestore.rules`

#### Key Rules:

1. **Users Collection:**
   - Drivers can read/write own doc (except role, email, fcmToken, orderRequestData)
   - Cloud Functions only can write to orderRequestData
   - Example:
     ```
     allow write: if request.auth.uid == userId
       && !request.resource.data.keys().hasAny(['orderRequestData'])
     ```

2. **Restaurant Orders Collection:**
   - Drivers can read orders they're assigned to:
     ```
     allow read: if request.auth.uid in resource.data.assignedDrivers[*].driverId
     ```
   - Drivers cannot write to `assignedDrivers` or `status` (no direct modifications)
   - Only admins and Cloud Functions can write

3. **Deliveries Collection:**
   - Drivers can read deliveries assigned to them
   - Drivers can update delivery status (e.g., "In Transit", "Delivered")
   - Admins can read/write all

## Data Structures

### Lightweight Order Reference

When assigning orders to drivers, the system uses lightweight references in `users/{driverId}.orderRequestData`:

```javascript
{
  orderId: "order-123",
  assignedAt: "2026-01-08T10:30:00Z",
  estimatedDistance: "2.5",
  estimatedTime: "12 min"
}
```

This minimizes data transfer and ensures fresh full order fetch by driver app.

### Full Order Structure

Driver app fetches full order from `restaurant_orders/{orderId}`:

```javascript
{
  id: "order-123",
  restaurantName: "Pizza Palace",
  restaurantId: "restaurant-456",
  authorId: "customer-789",
  products: [
    {
      id: "menu-item-1",
      name: "Margherita Pizza",
      quantity: 2,
      price: 12.99,
      notes: "Extra cheese"
    }
  ],
  address: {
    line1: "123 Main Street",
    line2: "Apt 4B",
    city: "New York",
    state: "NY",
    postalCode: "10001",
    country: "USA",
    coordinates: { latitude: 40.7128, longitude: -74.0060 }
  },
  status: "Driver Assignment Pending",
  assignedDrivers: [
    {
      driverId: "driver-111",
      assignedAt: "2026-01-08T10:30:00Z",
      estimatedDistance: "2.5",
      estimatedTime: "12 min",
      status: "Pending"
    },
    {
      driverId: "driver-222",
      assignedAt: "2026-01-08T10:30:00Z",
      estimatedDistance: "2.7",
      estimatedTime: "13 min",
      status: "Pending"
    },
    {
      driverId: "driver-333",
      assignedAt: "2026-01-08T10:30:00Z",
      estimatedDistance: "3.1",
      estimatedTime: "15 min",
      status: "Pending"
    }
  ],
  assignedDriverId: null,
  claimedAt: null,
  createdAt: "2026-01-08T10:25:00Z",
  updatedAt: "2026-01-08T10:30:00Z"
}
```

### Driver Assignment Status Enum

```
"Pending"    → Driver notified, waiting for response
"Accepted"   → Driver claimed the order
"Rejected"   → Driver rejected the order
```

### Order Status Enum

```
"Submitted"                    → Customer placed order
"Confirmed"                    → Restaurant confirmed
"Driver Assignment Pending"    → Waiting for driver to claim
"Driver Assigned"              → Driver claimed order
"In Transit"                   → Driver picked up and delivering
"Delivered"                    → Customer received order
"Cancelled"                    → Order cancelled
"Reassign Needed"              → All drivers rejected, need new assignment
```

## Integration Flow

### Step-by-Step: Multi-Driver Assignment

1. **Admin Triggers Assignment** (Web Dashboard)
   - Query top 3 nearest drivers using `getNearestDrivers()`
   - Create order with status = "Driver Assignment Pending"
   - Add 3 drivers to `assignedDrivers` array with status = "Pending"

2. **Server-Side Notification** (Cloud Function Trigger)
   - `notifyDriversOfNewOrder` trigger fires
   - Fetches FCM tokens for each driver
   - Sends push notification with lightweight `orderRequestData`

3. **Driver Receives Notification**
   - FCM notification received (foreground or background)
   - `useOrderNotification` hook parses `orderRequestData`
   - `useDriverRequest` listener detects `orderRequestData` in user doc
   - Full order fetched from Firestore
   - `NewOrderRequestModal` displays with 30s countdown

4. **Driver Action (Claim)**
   - Driver taps "Accept" button
   - `handleAccept` calls `claimOrder(orderId)`
   - Cloud Function atomically:
     - Checks if already claimed
     - Marks driver as "Accepted"
     - Marks other drivers as "Rejected"
     - Sets `order.status = "Driver Assigned"`
     - Clears `users/{otherId}.orderRequestData` for non-winning drivers
   - Modal closes, returns `{ success: true }`
   - Other drivers' modals show "Order Taken" alert
   - App navigates to Order Details / In-Progress screen

5. **Driver Action (Reject)**
   - Driver taps "Reject" button or timeout expires (30s)
   - `rejectOrder` Cloud Function atomically:
     - Marks driver as "Rejected"
     - Clears driver's `orderRequestData`
     - If all rejected: Sets `order.status = "Reassign Needed"`
   - Modal closes
   - Other drivers can still claim
   - Order returns to assignment pool for re-dispatch

### Error Handling

#### Scenario 1: Network Error During Claim
- User taps "Accept"
- Network fails during CF call
- Error alert displays: "Network error. Check connection and try again."
- Retry button shown → User taps Retry → Re-attempt claim

#### Scenario 2: Order Already Taken
- User taps "Accept"
- CF returns `{ alreadyTaken: true }` (another driver claimed first)
- Alert: "Order was taken by another driver"
- User taps OK → Modal closes → Order state cleared by listener

#### Scenario 3: Permission Denied
- User taps "Accept"
- CF returns `permission-denied` error
- Alert: "Not authorized to claim this order"
- Likely user wasn't in assignedDrivers array (rare edge case)

#### Scenario 4: Timeout Auto-Reject
- Modal displayed with 30s countdown
- Driver doesn't respond within 30 seconds
- Timer hits 0 → `rejectOrder` auto-called
- Modal closes
- Order becomes available for other drivers

#### Scenario 5: Offline When Order Arrives
- Driver has airplane mode on
- Push notification queued by FCM
- Driver disables airplane mode
- App comes to foreground → FCM delivers notification
- Normal flow resumes

## Testing

### Unit Tests

**File:** `src/driverapp/tests/componentTests.js`

- `useOrderClaim` hook: Successful claim, already-taken, network errors
- `NewOrderRequestModal`: Display order details, timeout behavior, accept/reject
- `useDriverRequest`: Full order fetching, loading states
- `useOrderNotification`: FCM permission, foreground/background notifications

Run: `npm test -- componentTests`

### Integration Tests

**File:** `src/driverapp/tests/integrationTests.js`

- Single driver claim (happy path)
- Multi-driver race condition (first-claim-wins)
- Manual driver rejection
- All drivers reject (reassign needed)
- Timeout auto-rejection
- Push notification delivery
- Firestore security rules

Run: `npm test -- integrationTests`

**Setup for Integration Tests:**

```javascript
const testContext = {
  driver1: { uid: 'driver-111', ... },
  driver2: { uid: 'driver-222', ... },
  driver3: { uid: 'driver-333', ... },
  order: { id: 'order-123', ... },
  db: firebaseAdmin.firestore(),
  functions: firebaseAdmin.functions(),
}

await runIntegrationTestSuite(testContext)
```

### Manual QA Checklist

1. **Single Driver Assignment**
   - Assign order to 1 driver
   - Verify modal displays with correct details and 30s timer
   - Click "Accept" → Order updates to "Driver Assigned"
   - Verify app navigates to Order Details screen

2. **Multi-Driver Assignment**
   - Use 3 test driver accounts
   - Assign same order to all 3 drivers
   - All 3 receive push notifications
   - Driver 1 claims first → All see "Order Taken" alert
   - Drivers 2 & 3 cannot re-attempt (order locked)

3. **Timeout Test**
   - Assign order
   - Wait 30 seconds without responding
   - Modal auto-rejects at 0s
   - Order returned to assignment pool

4. **Network Error Test**
   - Enable airplane mode
   - Try to claim order
   - Network error shown with retry button
   - Disable airplane mode, tap retry
   - Retry succeeds

5. **Security Test**
   - Attempt to write directly to `order.status` as driver
   - Verify Firestore rules reject the write
   - Attempt to read another driver's user doc
   - Verify Firestore rules deny access

## Deployment Checklist

- [ ] Cloud Functions deployed (`claimOrder`, `rejectOrder`, `notifyDriversOfNewOrder`)
- [ ] Firestore security rules deployed
- [ ] FCM credentials configured in Firebase Console
- [ ] Driver app updated with new hooks and components
- [ ] HomeScreen integrated with FCM listener
- [ ] Modal timeout value set appropriately (30s for production, shorter for testing)
- [ ] Logging added for debugging (claim attempts, rejections, errors)
- [ ] Performance monitoring enabled (track claim latency)
- [ ] Error tracking enabled (Sentry/Crashlytics)
- [ ] Acceptance tests passed
- [ ] QA manual testing completed
- [ ] Release notes prepared

## Future Enhancements

1. **Push Notification Sound/Vibration**
   - Add vibration pattern for order notifications
   - Custom sound alert
   - Badge counter on app icon

2. **Claim History**
   - Log all claim/reject attempts for analytics
   - Track driver response time distribution
   - Identify slow/non-responsive drivers

3. **Bidding System**
   - Instead of auto-assignment, allow drivers to bid
   - Driver sets price multiplier
   - Order goes to highest bidder or fastest responder

4. **Geofencing**
   - Auto-accept orders near driver's home/favorite zones
   - Schedule preferred delivery times
   - Avoid certain neighborhoods

5. **Smart Reassignment**
   - If initial 3 drivers reject, auto-increment radius
   - Find next 3 nearest drivers
   - Notify with higher incentive (surge pricing)

6. **A/B Testing**
   - Test different timeout durations (20s vs 30s vs 60s)
   - Test different distance/time display formats
   - Measure acceptance rate per variant
