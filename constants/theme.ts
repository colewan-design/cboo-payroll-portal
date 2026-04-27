import { Platform, useColorScheme } from 'react-native';

export const BSU = {
  green: '#1B5E20',
  greenMid: '#2E7D32',
  greenLight: '#E8F5E9',
  greenBorder: '#C8E6C9',
  gold: '#F5C200',
  goldDark: '#B8940A',
  orange: '#D97B00',
  textOnGreen: '#A5D6A7',
  textOnGreenSub: '#C8E6C9',
};

// Static accent/brand palette — header colors stay teal in both modes
export const TEAL = {
  primary: '#009688',
  dark: '#00796B',
  darker: '#00695C',
  light: '#E0F2F1',
  border: '#80CBC4',
  borderMid: '#4DB6AC',
  onPrimary: '#fff',
  textSub: '#B2DFDB',
  bg: '#F0FAFA',
  cardBorder: '#e5e7eb',
};

export type AppTheme = {
  primary: string;
  primaryDark: string;
  primaryDarker: string;
  primaryLight: string;   // teal-tinted icon/row backgrounds
  primaryBorder: string;  // input and chip borders
  onPrimary: string;
  headerSub: string;      // subtitle text on teal headers
  bg: string;
  cardBg: string;
  cardBorder: string;
  surface: string;        // subtle row / section backgrounds
  divider: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textLight: string;
  inputBg: string;
  inputBorder: string;
};

export const lightTheme: AppTheme = {
  primary: '#009688',
  primaryDark: '#00796B',
  primaryDarker: '#00695C',
  primaryLight: '#E0F2F1',
  primaryBorder: '#80CBC4',
  onPrimary: '#fff',
  headerSub: '#B2DFDB',
  bg: '#ffffff',
  cardBg: '#ffffff',
  cardBorder: '#e5e7eb',
  surface: '#f9fafb',
  divider: '#f3f4f6',
  textPrimary: '#111827',
  textSecondary: '#374151',
  textMuted: '#9ca3af',
  textLight: '#6b7280',
  inputBg: '#f9fafb',
  inputBorder: '#e5e7eb',
};

export const darkTheme: AppTheme = {
  primary: '#009688',
  primaryDark: '#4DB6AC',
  primaryDarker: '#80CBC4',
  primaryLight: '#0f2b28',
  primaryBorder: '#1d5c57',
  onPrimary: '#fff',
  headerSub: '#4DB6AC',
  bg: '#111827',
  cardBg: '#1f2937',
  cardBorder: '#374151',
  surface: '#374151',
  divider: '#2d3748',
  textPrimary: '#f9fafb',
  textSecondary: '#d1d5db',
  textMuted: '#6b7280',
  textLight: '#9ca3af',
  inputBg: '#1f2937',
  inputBorder: '#374151',
};

export function useAppTheme(): AppTheme {
  const scheme = useColorScheme();
  return scheme === 'dark' ? darkTheme : lightTheme;
}

const tintColorLight = TEAL.primary;
const tintColorDark = TEAL.borderMid;

export const Colors = {
  light: {
    text: '#11181C',
    background: '#ffffff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#111827',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
