import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { getAnnouncement } from '@/services/api';
import { TEAL, BSU, useAppTheme, AppTheme } from '@/constants/theme';
import { NewsItem } from '@/components/AnnouncementCard';

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export default function AnnouncementDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useAppTheme();
  const styles = makeStyles(theme);
  const [post, setPost] = useState<NewsItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!id) return;
    getAnnouncement(Number(id))
      .then(res => setPost(res.data.data ?? res.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>News</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={TEAL.primary} />
        </View>
      ) : error || !post ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={48} color={theme.textMuted} />
          <Text style={styles.errorTitle}>Could not load this post</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
            <Ionicons name="arrow-back-outline" size={14} color={TEAL.primary} />
            <Text style={styles.backLinkText}> Go back</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {post.original_image ? (
            <Image source={{ uri: post.original_image }} style={styles.image} resizeMode="cover" />
          ) : null}

          <View style={styles.body}>
            {post.is_pinned ? (
              <View style={styles.pinBadge}>
                <Ionicons name="pin" size={11} color={BSU.goldDark} />
                <Text style={styles.pinText}> Pinned</Text>
              </View>
            ) : null}

            <Text style={styles.title}>{post.title}</Text>

            <View style={styles.dateRow}>
              <Ionicons name="calendar-outline" size={12} color={theme.textMuted} />
              <Text style={styles.date}> {formatDate(post.published_at ?? post.created_at)}</Text>
            </View>

            <View style={styles.divider} />

            <Text style={styles.bodyText}>{stripHtml(post.content)}</Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function makeStyles(t: AppTheme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.bg },
    header: {
      backgroundColor: TEAL.primary,
      paddingTop: Platform.OS === 'ios' ? 56 : 48,
      paddingBottom: 14,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    backBtn: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: 'rgba(255,255,255,0.15)',
      alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: '#fff' },

    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 },
    errorTitle: { fontSize: 15, fontWeight: '700', color: t.textSecondary, textAlign: 'center' },
    backLink: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    backLinkText: { color: TEAL.primary, fontWeight: '600', fontSize: 14 },

    content: { paddingBottom: 48 },
    image: { width: '100%', height: 240 },
    body: { padding: 20 },
    pinBadge: {
      flexDirection: 'row', alignItems: 'center',
      alignSelf: 'flex-start',
      backgroundColor: '#fffbeb',
      borderRadius: 20, borderWidth: 1, borderColor: '#fde68a',
      paddingHorizontal: 10, paddingVertical: 4,
      marginBottom: 12,
    },
    pinText: { fontSize: 11, color: BSU.goldDark, fontWeight: '700' },
    title: { fontSize: 20, fontWeight: '800', color: t.textPrimary, lineHeight: 28, marginBottom: 8 },
    dateRow: { flexDirection: 'row', alignItems: 'center' },
    date: { fontSize: 12, color: t.textMuted, fontWeight: '500' },
    divider: { height: 1, backgroundColor: t.divider, marginVertical: 16 },
    bodyText: { fontSize: 15, color: t.textSecondary, lineHeight: 24 },
  });
}
