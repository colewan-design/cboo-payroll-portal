import { Platform } from 'react-native';

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

const tintColorLight = BSU.gold;
const tintColorDark = BSU.gold;

export const Colors = {
  light: {
    text: '#11181C',
    background: '#F5F5F0',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
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
