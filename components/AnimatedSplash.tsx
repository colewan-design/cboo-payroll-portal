import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';
import { Image } from 'expo-image';

type Props = { onFinish: () => void };

export default function AnimatedSplash({ onFinish }: Props) {
  const overlayOpacity = useSharedValue(1);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  useEffect(() => {
    // GIF duration is ~1910ms — start fading just before it loops
    overlayOpacity.value = withDelay(
      1800,
      withTiming(0, { duration: 400 }, (finished) => {
        if (finished) runOnJS(onFinish)();
      }),
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View style={[styles.overlay, overlayStyle]} pointerEvents="none">
      <Image
        source={require('@/assets/images/splash-animation.gif')}
        style={styles.gif}
        contentFit="contain"
        autoplay
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1B5E20',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  gif: {
    width: 280,
    height: 280,
  },
});
