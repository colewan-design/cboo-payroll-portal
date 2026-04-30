import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useCallback, useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import NewsCard, { NewsItem } from '@/components/AnnouncementCard';
import { getAnnouncements } from '@/services/api';
import { TEAL, useAppTheme, AppTheme } from '@/constants/theme';

export default function NewsScreen() {
  const theme = useAppTheme();
  const styles = makeStyles(theme);

  const [items, setItems] = useState<NewsItem[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const fetchPage = useCallback(async (p: number, replace: boolean) => {
    try {
      setError(false);
      const res = await getAnnouncements(p);
      const data: NewsItem[] = res.data.data ?? [];
      setLastPage(res.data.last_page ?? 1);
      setItems(prev => replace ? data : [...prev, ...data]);
      setPage(p);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    fetchPage(1, true).finally(() => setLoading(false));
  }, [fetchPage]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPage(1, true);
    setRefreshing(false);
  }, [fetchPage]);

  const onEndReached = useCallback(async () => {
    if (loadingMore || page >= lastPage) return;
    setLoadingMore(true);
    await fetchPage(page + 1, false);
    setLoadingMore(false);
  }, [fetchPage, loadingMore, page, lastPage]);

  if (loading) {
    return (
      <View style={styles.root}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>News</Text>
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={TEAL.primary} />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.root}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>News</Text>
        </View>
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={48} color={theme.textMuted} />
          <Text style={styles.errorText}>Could not load news.</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => { setLoading(true); fetchPage(1, true).finally(() => setLoading(false)); }}
          >
            <Ionicons name="refresh-outline" size={15} color="#fff" />
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>News</Text>
        {items.length > 0 ? (
          <Text style={styles.headerSub}>{items.length} post{items.length !== 1 ? 's' : ''}</Text>
        ) : null}
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <NewsCard item={item} />}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TEAL.primary} />
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          <View style={styles.center}>
            <Ionicons name="megaphone-outline" size={48} color={theme.textMuted} />
            <Text style={styles.emptyText}>No news yet.</Text>
            <Text style={styles.emptySubtext}>Check back later for updates.</Text>
          </View>
        }
        ListFooterComponent={
          loadingMore
            ? <ActivityIndicator color={TEAL.primary} style={{ paddingVertical: 20 }} />
            : null
        }
      />
    </View>
  );
}

function makeStyles(t: AppTheme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: t.bg },
    header: {
      backgroundColor: TEAL.primary,
      paddingTop: Platform.OS === 'ios' ? 56 : 48,
      paddingBottom: 20,
      paddingHorizontal: 20,
    },
    headerTitle: { fontSize: 22, fontWeight: '700', color: '#fff', letterSpacing: -0.3 },
    headerSub: { fontSize: 12, color: TEAL.textSub, marginTop: 4 },
    list: { padding: 16, paddingBottom: 32 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8 },
    errorText: { fontSize: 14, color: t.textLight, textAlign: 'center' },
    retryBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      backgroundColor: TEAL.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10,
      marginTop: 4,
    },
    retryText: { fontSize: 14, color: '#fff', fontWeight: '600' },
    emptyText: { fontSize: 16, fontWeight: '700', color: t.textSecondary },
    emptySubtext: { fontSize: 13, color: t.textMuted },
  });
}
