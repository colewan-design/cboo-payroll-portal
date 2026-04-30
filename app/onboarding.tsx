import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  useWindowDimensions,
  Platform,
  StatusBar,
  Image,
} from 'react-native';
import { useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { TEAL, BSU, useAppTheme, AppTheme } from '@/constants/theme';

type Slide = {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  title: string;
  subtitle: string;
};

const SLIDES: Slide[] = [
  {
    id: '1',
    icon: 'hand-right-outline',
    iconBg: TEAL.primary,
    title: 'Welcome to CBOO Payroll Portal',
    subtitle:
      'Your personal payroll self-service hub at Benguet State University — accessible anytime, anywhere.',
  },
  {
    id: '2',
    icon: 'document-text-outline',
    iconBg: BSU.green,
    title: 'Access Your Payslips',
    subtitle:
      'View and download your monthly payslips with a full breakdown of your salary, deductions, and net pay.',
  },
  {
    id: '3',
    icon: 'megaphone-outline',
    iconBg: BSU.goldDark,
    title: 'Stay Informed',
    subtitle:
      'Receive HR news and important updates directly on your device so you never miss a thing.',
  },
  {
    id: '4',
    icon: 'checkmark-circle-outline',
    iconBg: TEAL.darker,
    title: "You're All Set!",
    subtitle:
      'Start exploring your payroll information. Your data is secure and available whenever you need it.',
  },
];

export default function OnboardingScreen() {
  const { user, markOnboardingDone } = useAuth();
  const router = useRouter();
  const theme = useAppTheme();
  const styles = makeStyles(theme);
  const { width } = useWindowDimensions();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const firstName = user?.first_name ?? 'there';

  async function finish() {
    await markOnboardingDone();
    router.replace('/(tabs)');
  }

  function next() {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    } else {
      finish();
    }
  }

  const isLast = currentIndex === SLIDES.length - 1;

  return (
    <View style={styles.root}>
      {/* Header — matches the app's top bar */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image
            source={require('@/assets/images/bsu-logo.png')}
            style={styles.bsuLogo}
            resizeMode="contain"
          />
          <View style={styles.headerTextBlock}>
            <Image
              source={require('@/assets/images/App Heading.png')}
              style={styles.appHeading}
              resizeMode="contain"
            />
            <Text style={styles.welcomeText}>Welcome, {firstName}!</Text>
          </View>
        </View>
      </View>

      {/* Skip button */}
      <TouchableOpacity style={styles.skipBtn} onPress={finish} activeOpacity={0.7}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentIndex(idx);
        }}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <View style={[styles.iconCircle, { backgroundColor: item.iconBg }]}>
              <Ionicons name={item.icon} size={56} color="#fff" />
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.subtitle}>{item.subtitle}</Text>
          </View>
        )}
      />

      {/* Footer — dots + action button */}
      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[styles.dot, i === currentIndex && styles.dotActive]} />
          ))}
        </View>

        <TouchableOpacity
          style={[styles.nextBtn, isLast && styles.nextBtnLast]}
          onPress={next}
          activeOpacity={0.85}
        >
          <Text style={styles.nextText}>{isLast ? 'Get Started' : 'Next'}</Text>
          <Ionicons
            name={isLast ? 'checkmark' : 'arrow-forward'}
            size={18}
            color="#fff"
            style={{ marginLeft: 6 }}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function makeStyles(t: AppTheme) {
  const statusBarHeight = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 44;
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: t.bg,
    },

    /* ── Header ── */
    header: {
      paddingTop: statusBarHeight,
      paddingHorizontal: 16,
      paddingBottom: 12,
      backgroundColor: TEAL.primary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    bsuLogo: {
      width: 48,
      height: 48,
    },
    headerTextBlock: {
      justifyContent: 'center',
      gap: 2,
    },
    appHeading: {
      height: 32,
      width: 120,
    },
    welcomeText: {
      fontSize: 12,
      color: 'rgba(255,255,255,0.85)',
      fontWeight: '500',
    },

    /* ── Skip ── */
    skipBtn: {
      position: 'absolute',
      top: statusBarHeight + 56,
      right: 24,
      zIndex: 10,
      paddingVertical: 6,
      paddingHorizontal: 12,
    },
    skipText: {
      fontSize: 14,
      fontWeight: '600',
      color: t.textMuted,
    },

    /* ── Slides ── */
    slide: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 36,
      paddingBottom: 32,
    },
    iconCircle: {
      width: 128,
      height: 128,
      borderRadius: 64,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 36,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 6,
    },
    title: {
      fontSize: 24,
      fontWeight: '800',
      color: t.textPrimary,
      textAlign: 'center',
      marginBottom: 16,
      lineHeight: 32,
    },
    subtitle: {
      fontSize: 15,
      color: t.textLight,
      textAlign: 'center',
      lineHeight: 24,
    },

    /* ── Footer ── */
    footer: {
      paddingHorizontal: 28,
      paddingBottom: 48,
      paddingTop: 12,
      gap: 24,
    },
    dots: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 8,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: t.inputBorder,
    },
    dotActive: {
      width: 24,
      backgroundColor: TEAL.primary,
    },
    nextBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: TEAL.primary,
      borderRadius: 14,
      paddingVertical: 16,
    },
    nextBtnLast: {
      backgroundColor: BSU.green,
    },
    nextText: {
      fontSize: 16,
      fontWeight: '800',
      color: '#fff',
    },
  });
}
