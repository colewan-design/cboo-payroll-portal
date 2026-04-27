import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';
import { Image } from 'expo-image';

type Props = { isReady: boolean; onFinish: () => void };

export default function AnimatedSplash({ isReady, onFinish }: Props) {
  const overlayOpacity = useSharedValue(1);
  const [minTimeDone, setMinTimeDone] = useState(false);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  // Enforce a minimum 2-second display regardless of how fast auth resolves
  useEffect(() => {
    const t = setTimeout(() => setMinTimeDone(true), 2000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!isReady || !minTimeDone) return;
    overlayOpacity.value = withDelay(
      200,
      withTiming(0, { duration: 500 }, (finished) => {
        if (finished) runOnJS(onFinish)();
      }),
    );
  }, [isReady, minTimeDone]);

  return (
    <Animated.View style={[styles.overlay, overlayStyle]} pointerEvents="none">
      <Image
        source={require('@/assets/images/bsu-payroll-splash-screen.png')}
        style={styles.image}
        contentFit="cover"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
  },
  image: {
    ...StyleSheet.absoluteFillObject,
  },
});
