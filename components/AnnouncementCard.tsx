import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';

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
            <Text style={styles.pinText}>📌 Pinned</Text>
          </View>
        ) : null}

        <Text style={styles.title} numberOfLines={2}>{item.title}</Text>

        <Text style={styles.preview} numberOfLines={2}>
          {stripHtml(item.content)}
        </Text>

        <Text style={styles.date}>
          {formatDate(item.published_at ?? item.created_at)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  thumbnail: { width: '100%', height: 160 },
  body: { padding: 14 },
  pinBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#fef9c3',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 6,
  },
  pinText: { fontSize: 11, color: '#92400e', fontWeight: '600' },
  title: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 4 },
  preview: { fontSize: 13, color: '#6b7280', lineHeight: 20, marginBottom: 8 },
  date: { fontSize: 11, color: '#9ca3af', fontWeight: '500' },
});
