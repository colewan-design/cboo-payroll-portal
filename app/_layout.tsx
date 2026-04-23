import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';
import messaging from '@react-native-firebase/messaging';
import * as SplashScreen from 'expo-splash-screen';
import { Platform } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { registerForPushNotifications } from '@/services/notifications';
import AnimatedSplash from '@/components/AnimatedSplash';

// Keep native splash visible until we are ready to replace it
SplashScreen.preventAutoHideAsync();

// Background handler must run at module level on native only
if (Platform.OS !== 'web') {
  messaging().setBackgroundMessageHandler(async () => {});
}

function RootLayoutNav() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const [showAnimatedSplash, setShowAnimatedSplash] = useState(true);

  // Once auth resolves, hide the native splash and hand off to the animated one
  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync();
    }
  }, [isLoading]);

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
        <Stack.Screen name="announcement" />
        <Stack.Screen name="modal" options={{ presentation: 'modal', headerShown: true, title: 'Info' }} />
      </Stack>
      <StatusBar style="light" />

      {/* Animated splash sits on top of everything until its animation finishes */}
      {showAnimatedSplash && !isLoading && (
        <AnimatedSplash onFinish={() => setShowAnimatedSplash(false)} />
      )}
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
