import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import messaging from '@react-native-firebase/messaging';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { registerForPushNotifications } from '@/services/notifications';

// Handle notifications received while app is in background/quit state
messaging().setBackgroundMessageHandler(async () => {});

function RootLayoutNav() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const colorScheme = useColorScheme();

  useEffect(() => {
    if (isLoading) return;
    const inAuth = (segments[0] as string) === '(auth)';
    if (!user && !inAuth) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      router.replace('/(auth)/login' as any);
    } else if (user && inAuth) {
      router.replace('/(tabs)');
    }
  }, [user, isLoading, segments]);

  useEffect(() => {
    if (!user) return;

    // Register FCM token with backend
    registerForPushNotifications().catch((err) => {
      console.error('[Push] registration failed:', err);
    });

    // Foreground message — navigate directly to announcement
    const unsubForeground = messaging().onMessage(async (remoteMessage) => {
      const id = remoteMessage.data?.announcement_id;
      if (id) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        router.push(`/announcement/${id}` as any);
      }
    });

    // App opened from background notification tap
    const unsubOpened = messaging().onNotificationOpenedApp((remoteMessage) => {
      const id = remoteMessage.data?.announcement_id;
      if (id) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        router.push(`/announcement/${id}` as any);
      }
    });

    // App opened from quit state via notification tap
    messaging()
      .getInitialNotification()
      .then((remoteMessage) => {
        if (remoteMessage?.data?.announcement_id) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          router.push(`/announcement/${remoteMessage.data.announcement_id}` as any);
        }
      });

    return () => {
      unsubForeground();
      unsubOpened();
    };
  }, [user]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="announcement" />
        <Stack.Screen name="modal" options={{ presentation: 'modal', headerShown: true, title: 'Info' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
