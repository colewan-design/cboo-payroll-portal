import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';
import messaging from '@react-native-firebase/messaging';
import { Platform } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { NetworkProvider } from '@/context/NetworkContext';
import { registerForPushNotifications } from '@/services/notifications';
import AnimatedSplash from '@/components/AnimatedSplash';
import OfflineBanner from '@/components/OfflineBanner';

// Background handler must run at module level on native only
if (Platform.OS !== 'web') {
  messaging().setBackgroundMessageHandler(async () => {});
}

function RootLayoutNav() {
  const { user, isLoading, hasSeenOnboarding } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const [showAnimatedSplash, setShowAnimatedSplash] = useState(true);

  useEffect(() => {
    if (isLoading) return;
    const inAuth = (segments[0] as string) === '(auth)';
    const inOnboarding = (segments[0] as string) === 'onboarding';
    if (!user && !inAuth) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      router.replace('/(auth)/login' as any);
    } else if (user && !hasSeenOnboarding && !inOnboarding) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      router.replace('/onboarding' as any);
    } else if (user && hasSeenOnboarding && (inAuth || inOnboarding)) {
      router.replace('/(tabs)');
    }
  }, [user, isLoading, hasSeenOnboarding, segments]);

  useEffect(() => {
    if (!user || Platform.OS === 'web') return;

    registerForPushNotifications().catch((err) => {
      console.error('[Push] registration failed:', err);
    });

    const unsubForeground = messaging().onMessage(async (remoteMessage) => {
      const id = remoteMessage.data?.announcement_id;
      if (id) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        router.push(`/announcement/${id}` as any);
      }
    });

    const unsubOpened = messaging().onNotificationOpenedApp((remoteMessage) => {
      const id = remoteMessage.data?.announcement_id;
      if (id) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        router.push(`/announcement/${id}` as any);
      }
    });

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
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="announcement" />
        <Stack.Screen name="modal" options={{ presentation: 'modal', headerShown: true, title: 'Info' }} />
      </Stack>
      <StatusBar style="light" />

      <OfflineBanner />

      {showAnimatedSplash && (
        <AnimatedSplash
          isReady={!isLoading}
          onFinish={() => setShowAnimatedSplash(false)}
        />
      )}
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <NetworkProvider>
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
    </NetworkProvider>
  );
}
