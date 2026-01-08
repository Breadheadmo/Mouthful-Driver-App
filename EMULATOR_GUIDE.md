# Firebase Emulator Quick Start Guide

## Running Cloud Functions Locally (No Blaze Plan Required)

### Step 1: Start the Emulators

```bash
# From project root
firebase emulators:start --project mouthful-foods-ca124
```

This will start:
- **Firestore Emulator**: http://127.0.0.1:8080
- **Auth Emulator**: http://127.0.0.1:9099
- **Functions Emulator**: http://127.0.0.1:5001
- **Emulator UI**: http://127.0.0.1:4000 (main dashboard)

### Step 2: Enable Emulators in Driver App

Edit `src/core/firebase/config.js`:

```javascript
const USE_EMULATORS = true // Change from false to true
```

Or use the emulator config:

```javascript
// In src/core/firebase/config.js
export * from './config.emulator'
```

### Step 3: Run Your Driver App

```bash
npm start
```

The app will now connect to local emulators instead of production Firebase.

---

## Testing Cloud Functions Locally

### Test claimOrder Function

```bash
# Using curl (PowerShell)
$body = @{
    data = @{
        orderId = "test-order-123"
    }
} | ConvertTo-Json

Invoke-WebRequest -Method POST `
  -Uri "http://127.0.0.1:5001/mouthful-foods-ca124/us-central1/claimOrder" `
  -ContentType "application/json" `
  -Body $body
```

### Test rejectOrder Function

```bash
$body = @{
    data = @{
        orderId = "test-order-123"
    }
} | ConvertTo-Json

Invoke-WebRequest -Method POST `
  -Uri "http://127.0.0.1:5001/mouthful-foods-ca124/us-central1/rejectOrder" `
  -ContentType "application/json" `
  -Body $body
```

---

## Emulator UI Features

Visit **http://127.0.0.1:4000** for:

- 📊 **Firestore Data Viewer** - See/edit database documents in real-time
- 👤 **Authentication** - Create test users
- ⚡ **Functions Logs** - View Cloud Function execution logs
- 🔍 **Request Inspector** - Debug function calls

---

## Creating Test Data

### Create Test Driver User

1. Go to http://127.0.0.1:4000
2. Click "Authentication"
3. Add User:
   - Email: `driver1@test.com`
   - Password: `password123`
   - User ID: `driver-111`

4. Go to "Firestore"
5. Create document in `users/driver-111`:
   ```json
   {
     "id": "driver-111",
     "email": "driver1@test.com",
     "role": "driver",
     "firstName": "Test",
     "lastName": "Driver",
     "isActive": true,
     "location": {
       "latitude": 40.7128,
       "longitude": -74.0060
     }
   }
   ```

### Create Test Order

In Firestore UI, create `restaurant_orders/order-123`:

```json
{
  "id": "order-123",
  "restaurantName": "Pizza Palace",
  "restaurantId": "restaurant-1",
  "authorId": "customer-1",
  "status": "Driver Assignment Pending",
  "products": [
    {
      "id": "item-1",
      "name": "Margherita Pizza",
      "quantity": 2,
      "price": 12.99
    }
  ],
  "address": {
    "line1": "123 Main St",
    "city": "New York",
    "postalCode": "10001"
  },
  "assignedDrivers": [
    {
      "driverId": "driver-111",
      "assignedAt": "2026-01-08T10:00:00Z",
      "estimatedDistance": "2.5",
      "estimatedTime": "12 min",
      "status": "Pending"
    }
  ]
}
```

### Trigger Order Notification

In Firestore UI, update `users/driver-111`:

```json
{
  "orderRequestData": {
    "orderId": "order-123",
    "assignedAt": "2026-01-08T10:00:00Z",
    "estimatedDistance": "2.5",
    "estimatedTime": "12 min"
  }
}
```

The driver app should immediately show the modal!

---

## Benefits of Emulators

✅ **No Blaze Plan Required** - Completely free local testing
✅ **Fast Iteration** - Instant deployment of function changes
✅ **Offline Development** - Work without internet
✅ **Data Persistence** - Emulator data saved between sessions
✅ **Security Rules Testing** - Test Firestore rules locally
✅ **Full Feature Parity** - Same APIs as production

---

## Emulator Commands Reference

```bash
# Start all emulators
firebase emulators:start

# Start specific emulators
firebase emulators:start --only functions,firestore

# Import/Export data
firebase emulators:export ./emulator-data
firebase emulators:start --import ./emulator-data

# View logs
firebase emulators:start --debug
```

---

## When to Upgrade to Blaze Plan

Emulators are perfect for:
- ✅ Local development
- ✅ Testing features
- ✅ Integration tests
- ✅ CI/CD pipelines

You **must** upgrade to Blaze plan for:
- ❌ Production deployment
- ❌ Real users accessing Cloud Functions
- ❌ Remote testing (non-localhost)
- ❌ Push notifications from Cloud Functions

---

## Troubleshooting

### Emulator Won't Start
```bash
# Kill any existing processes on ports
Stop-Process -Id (Get-NetTCPConnection -LocalPort 5001).OwningProcess -Force
Stop-Process -Id (Get-NetTCPConnection -LocalPort 8080).OwningProcess -Force
```

### Functions Not Loading
```bash
# Reinstall dependencies
cd firebase/functions
npm install
cd ../..
firebase emulators:start
```

### App Can't Connect to Emulator
- Check `USE_EMULATORS = true` in config
- For physical devices, use your computer's IP instead of `127.0.0.1`
- Disable firewall for ports 5001, 8080, 9099, 4000

---

## Next Steps

1. ✅ Start emulators: `firebase emulators:start`
2. ✅ Open UI: http://127.0.0.1:4000
3. ✅ Create test data (driver user + order)
4. ✅ Enable emulators in app config
5. ✅ Run driver app: `npm start`
6. ✅ Test claim/reject flow

**You can now develop and test everything locally without the Blaze plan!** 🎉

When ready for production, upgrade to Blaze plan and deploy with:
```bash
firebase deploy --only functions --project mouthful-foods-ca124
```
