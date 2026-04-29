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
import { getNewsItem } from '@/services/api';
import { NewsItem } from '@/components/NewsItemCard';

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

export default function NewsItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [post, setPost] = useState<NewsItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!id) return;
    getNewsItem(Number(id))
      .then(res => setPost(res.data.data ?? res.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>News</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1B5E20" />
        </View>
      ) : error || !post ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Could not load this news post.</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.retryText}>Go back</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {post.original_image ? (
            <Image source={{ uri: post.original_image }} style={styles.image} resizeMode="cover" />
          ) : null}

          <View style={styles.body}>
            {post.is_pinned ? (
              <View style={styles.pinBadge}>
                <Text style={styles.pinText}>📌 Pinned</Text>
              </View>
            ) : null}

            <Text style={styles.title}>{post.title}</Text>
            <Text style={styles.date}>
              {formatDate(post.published_at ?? post.created_at)}
            </Text>

            <View style={styles.divider} />

            <Text style={styles.bodyText}>{stripHtml(post.content)}</Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  header: {
    backgroundColor: '#1B5E20',
    paddingTop: Platform.OS === 'ios' ? 56 : 48,
    paddingBottom: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: { paddingRight: 8 },
  backText: { color: '#A5D6A7', fontSize: 15, fontWeight: '600' },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: '#fff' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { fontSize: 14, color: '#6b7280', marginBottom: 8, textAlign: 'center' },
  retryText: { fontSize: 14, color: '#1B5E20', fontWeight: '600' },

  content: { paddingBottom: 40 },
  image: { width: '100%', height: 220 },
  body: { padding: 20 },
  pinBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#fef9c3',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 10,
  },
  pinText: { fontSize: 12, color: '#92400e', fontWeight: '600' },
  title: { fontSize: 20, fontWeight: '800', color: '#111827', lineHeight: 28 },
  date: { fontSize: 12, color: '#9ca3af', marginTop: 6, marginBottom: 4 },
  divider: { height: 1, backgroundColor: '#e5e7eb', marginVertical: 16 },
  bodyText: { fontSize: 15, color: '#374151', lineHeight: 24 },
});
