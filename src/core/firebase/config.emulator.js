// Firebase Emulator Configuration
// Use this during local development without Blaze plan

import fauth from '@react-native-firebase/auth'
import ffirestore from '@react-native-firebase/firestore'
import ffunctions from '@react-native-firebase/functions'

// Enable emulators for local testing
const USE_EMULATORS = false // Set to true when running emulators locally

if (USE_EMULATORS) {
  // Connect to local emulators
  const EMULATOR_HOST = '127.0.0.1' // Use your machine's IP for physical devices
  
  // Firestore emulator
  ffirestore().useEmulator(EMULATOR_HOST, 8080)
  
  // Auth emulator
  fauth().useEmulator(`http://${EMULATOR_HOST}:9099`)
  
  // Functions emulator
  ffunctions().useEmulator(EMULATOR_HOST, 5001)
  
  console.log('🔧 Firebase Emulators Enabled')
  console.log('Firestore: http://127.0.0.1:8080')
  console.log('Auth: http://127.0.0.1:9099')
  console.log('Functions: http://127.0.0.1:5001')
  console.log('UI: http://127.0.0.1:4000')
}

export const db = ffirestore()
export const auth = fauth
export const firestore = ffirestore
export const functions = ffunctions
export const uploadMediaFunctionURL = USE_EMULATORS
  ? 'http://127.0.0.1:5001/development-69cdc/us-central1/uploadMedia'
  : 'https://us-central1-development-69cdc.cloudfunctions.net/uploadMedia'

export { USE_EMULATORS }
