import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TEAL, BSU, useAppTheme, AppTheme } from '@/constants/theme';

export type Announcement = {
  id: number;
  title: string;
  content: string;
  status: string;
  is_pinned: boolean;
  published_at: string | null;
  original_image: string | null;
  created_at: string;
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

export default function AnnouncementCard({ item }: { item: Announcement }) {
  const router = useRouter();
  const theme = useAppTheme();
  const styles = makeStyles(theme);

  return (
    <TouchableOpacity
      style={styles.card}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onPress={() => router.push(`/announcement/${item.id}` as any)}
      activeOpacity={0.75}
    >
      {item.original_image ? (
        <Image source={{ uri: item.original_image }} style={styles.thumbnail} resizeMode="cover" />
      ) : null}

      <View style={styles.body}>
        {item.is_pinned ? (
          <View style={styles.pinBadge}>
            <Ionicons name="pin" size={10} color={BSU.goldDark} />
            <Text style={styles.pinText}> Pinned</Text>
          </View>
        ) : null}

        <Text style={styles.title} numberOfLines={2}>{item.title}</Text>

        <Text style={styles.preview} numberOfLines={3}>
          {stripHtml(item.content)}
        </Text>

        <View style={styles.footer}>
          <View style={styles.dateRow}>
            <Ionicons name="calendar-outline" size={11} color={theme.textMuted} />
            <Text style={styles.date}> {formatDate(item.published_at ?? item.created_at)}</Text>
          </View>
          <View style={styles.readMoreRow}>
            <Text style={styles.readMore}>Read more</Text>
            <Ionicons name="arrow-forward" size={12} color={TEAL.primary} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function makeStyles(t: AppTheme) {
  return StyleSheet.create({
    card: {
      backgroundColor: t.cardBg,
      borderRadius: 16,
      marginBottom: 12,
      overflow: 'hidden',
      borderWidth: 0.5,
      borderColor: t.cardBorder,
    },
    thumbnail: { width: '100%', height: 168 },
    body: { padding: 16 },
    pinBadge: {
      flexDirection: 'row', alignItems: 'center',
      alignSelf: 'flex-start',
      backgroundColor: '#fffbeb',
      borderRadius: 20, borderWidth: 1, borderColor: '#fde68a',
      paddingHorizontal: 10, paddingVertical: 4,
      marginBottom: 10,
    },
    pinText: { fontSize: 11, color: BSU.goldDark, fontWeight: '700' },
    title: { fontSize: 15, fontWeight: '700', color: t.textPrimary, lineHeight: 22, marginBottom: 6 },
    preview: { fontSize: 13, color: t.textLight, lineHeight: 20, marginBottom: 12 },
    footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    dateRow: { flexDirection: 'row', alignItems: 'center' },
    date: { fontSize: 11, color: t.textMuted, fontWeight: '500' },
    readMoreRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    readMore: { fontSize: 12, fontWeight: '700', color: TEAL.primary },
  });
}
