import messaging from '@react-native-firebase/messaging';
//import PushNotification from 'react-native-push-notification';
//import PushNotificationIOS from '@react-native-community/push-notification-ios';
import { Platform, Alert, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage'

function openAppSettings() {
  if (Platform.OS === 'ios') {
    Linking.openURL('app-settings:');
  } else {
    Linking.openSettings();
  }
}
export async function checkPermissionStatus() {
  const storedStatus = await AsyncStorage.getItem(
    'notificationPermissionStatus',
  )
  if (storedStatus) {
    const authStatus = parseInt(storedStatus, 10)
    if (authStatus === messaging.AuthorizationStatus.DENIED) {
      console.log('Notification permission already denied.')
    } else if (authStatus === messaging.AuthorizationStatus.AUTHORIZED) {
      console.log('Notification permission already granted.')
    }
  } else {
    const authStatus = await messaging().hasPermission()
    if (authStatus === messaging.AuthorizationStatus.NOT_DETERMINED) {
      // Request permission if not determined
      await requestUserPermission()
    } else if (authStatus === messaging.AuthorizationStatus.DENIED) {
      await AsyncStorage.setItem(
        'notificationPermissionStatus',
        authStatus.toString(),
      )
      Alert.alert(
        'Notification Permissions Denied',
        'Please enable notifications in settings to receive alerts.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: openAppSettings },
        ],
      );
    } else if (authStatus === messaging.AuthorizationStatus.AUTHORIZED) {
      await AsyncStorage.setItem(
        'notificationPermissionStatus',
        authStatus.toString(),
      );
      console.log('Notification permission already granted.')
    }
  }
}
