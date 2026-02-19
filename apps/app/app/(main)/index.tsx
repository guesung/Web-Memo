import { MemoCard, type MemoItem } from "@/components/memo/MemoCard";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useLocalMemos } from "@/lib/hooks/useLocalMemos";
import { useMemosInfinite } from "@/lib/hooks/useMemos";
import { Globe } from "lucide-react-native";
import { useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

export default function MemoScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session } = useAuth();
  const isLoggedIn = !!session;

  const {
    data: localMemosData,
    isLoading: isLocalLoading,
    refetch: refetchLocal,
  } = useLocalMemos();
  const {
    data: supabaseMemosData,
    isLoading: isSupabaseLoading,
    refetch: refetchSupabase,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useMemosInfinite();

  const memos: MemoItem[] = isLoggedIn
    ? (supabaseMemosData?.pages.flatMap((p) => p.data) ?? [])
    : (localMemosData ?? []);
  const isLoading = isLoggedIn ? isSupabaseLoading : isLocalLoading;
  const refetch = isLoggedIn ? refetchSupabase : refetchLocal;

  const navigateToBrowser = useCallback(
    (url: string) => {
      router.navigate({
        pathname: "/(main)/browser",
        params: { url: encodeURIComponent(url) },
      });
    },
    [router],
  );

  const handleEndReached = () => {
    if (isLoggedIn && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.homeContent}>
        {/* Header */}
        <View style={styles.homeHeader}>
          <Text style={styles.brandTitle}>Web Memo</Text>
        </View>

        <Text style={styles.brandSubtitle}>웹서핑하며 메모하세요</Text>

        {/* Memos */}
        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} size="large" />
        ) : memos.length > 0 ? (
          <View style={styles.memosSection}>
            <Text style={styles.sectionTitle}>최근 메모</Text>
            <FlatList
              data={memos}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <MemoCard
                  memo={item}
                  onPress={() => {
                    const url = item.url;
                    if (url) navigateToBrowser(url);
                  }}
                />
              )}
              contentContainerStyle={styles.memosList}
              onRefresh={() => refetch()}
              refreshing={false}
              onEndReached={handleEndReached}
              onEndReachedThreshold={0.5}
              ListFooterComponent={
                isFetchingNextPage ? (
                  <ActivityIndicator style={{ paddingVertical: 16 }} />
                ) : null
              }
            />
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Globe size={48} color="#ddd" />
            <Text style={styles.emptyText}>URL을 입력해서 웹서핑을 시작하세요</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  homeContent: { flex: 1 },
  homeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 4,
  },
  brandTitle: { fontSize: 22, fontWeight: "800", color: "#111", letterSpacing: -0.5 },
  brandSubtitle: { fontSize: 14, color: "#888", paddingHorizontal: 20, marginBottom: 16 },
  memosSection: { flex: 1, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: "#111", marginBottom: 12 },
  memosList: { paddingBottom: 32 },
  emptyState: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, color: "#bbb" },
});
