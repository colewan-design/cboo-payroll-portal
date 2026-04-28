import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNetwork } from '@/context/NetworkContext';

export default function OfflineBanner() {
  const { isOnline } = useNetwork();

  // Track whether we've ever gone offline so the "Back online" flash works
  const wasOffline = useRef(false);
  const translateY = useRef(new Animated.Value(-80)).current;
  const bgColor = useRef(new Animated.Value(0)).current; // 0 = red, 1 = green

  useEffect(() => {
    if (!isOnline) {
      wasOffline.current = true;
      bgColor.setValue(0);
      // Slide in
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 60,
        friction: 10,
      }).start();
    } else if (wasOffline.current) {
      // Brief "Back online" flash, then slide out
      bgColor.setValue(1);
      Animated.sequence([
        Animated.delay(1500),
        Animated.spring(translateY, {
          toValue: -80,
          useNativeDriver: true,
          tension: 60,
          friction: 10,
        }),
      ]).start(() => {
        wasOffline.current = false;
      });
    }
  }, [isOnline]);

  const backgroundColor = bgColor.interpolate({
    inputRange: [0, 1],
    outputRange: ['#dc2626', '#16a34a'],
  });

  return (
    <Animated.View
      style={[styles.banner, { transform: [{ translateY }], backgroundColor }]}
      pointerEvents="none"
    >
      <Ionicons
        name={isOnline ? 'wifi-outline' : 'cloud-offline-outline'}
        size={16}
        color="#fff"
      />
      <Text style={styles.text}>
        {isOnline ? 'Back online — data refreshed' : 'No internet connection · Showing cached data'}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingTop: Platform.OS === 'ios' ? 52 : 36,
    paddingBottom: 10,
    paddingHorizontal: 16,
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
});
