import messaging from '@react-native-firebase/messaging';
import { Platform } from 'react-native';
import { registerDeviceToken } from '@/services/api';

export async function registerForPushNotifications(): Promise<string | null> {
  const authStatus = await messaging().requestPermission();
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;

  if (!enabled) {
    console.warn('[Push] Permission not granted');
    return null;
  }

  const token = await messaging().getToken();
  console.log('[Push] FCM Token:', token);

  const platform = Platform.OS === 'ios' ? 'ios' : 'android';
  await registerDeviceToken(token, platform);
  console.log('[Push] Token registered with backend ✓');

  return token;
}
