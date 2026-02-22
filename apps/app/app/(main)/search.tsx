import { MemoCard, type MemoItem } from "@/components/memo/MemoCard";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useLocalMemos } from "@/lib/hooks/useLocalMemos";
import { useMemosInfinite } from "@/lib/hooks/useMemos";
import { Search as SearchIcon } from "lucide-react-native";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session } = useAuth();
  const isLoggedIn = !!session;

  const [searchQuery, setSearchQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");

  const { data: localMemosData, isLoading: isLocalLoading } = useLocalMemos();
  const {
    data: supabaseMemosData,
    isLoading: isSupabaseLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useMemosInfinite(submittedQuery ? { searchQuery: submittedQuery } : undefined);

  const allMemos: MemoItem[] = isLoggedIn
    ? (supabaseMemosData?.pages.flatMap((p) => p.data) ?? [])
    : (localMemosData ?? []);

  const filteredMemos = submittedQuery
    ? isLoggedIn
      ? allMemos
      : allMemos.filter(
          (m) =>
            m.title?.toLowerCase().includes(submittedQuery.toLowerCase()) ||
            m.memo?.toLowerCase().includes(submittedQuery.toLowerCase()) ||
            m.url?.toLowerCase().includes(submittedQuery.toLowerCase()),
        )
    : [];

  const isLoading = isLoggedIn ? isSupabaseLoading : isLocalLoading;

  const handleSearch = () => {
    const q = searchQuery.trim();
    if (q) setSubmittedQuery(q);
  };

  const handleEndReached = () => {
    if (isLoggedIn && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  const handleMemoPress = useCallback(
    (url: string | null) => {
      if (url) {
        router.navigate({
          pathname: "/(main)/browser",
          params: { url: encodeURIComponent(url) },
        });
      }
    },
    [router],
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>검색</Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <SearchIcon size={18} color="#999" />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            placeholder="메모 검색..."
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
        </View>
      </View>

      {!submittedQuery ? (
        <View style={styles.emptyState}>
          <SearchIcon size={48} color="#ddd" />
          <Text style={styles.emptyText}>메모를 검색해보세요</Text>
        </View>
      ) : isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" />
      ) : filteredMemos.length > 0 ? (
        <FlatList
          data={filteredMemos}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <MemoCard memo={item} onPress={() => handleMemoPress(item.url)} />
          )}
          contentContainerStyle={styles.resultsList}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isFetchingNextPage ? <ActivityIndicator style={{ paddingVertical: 16 }} /> : null
          }
        />
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>검색 결과가 없습니다</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 4,
  },
  title: { fontSize: 22, fontWeight: "800", color: "#111", letterSpacing: -0.5 },
  searchContainer: { paddingHorizontal: 20, marginTop: 12, marginBottom: 20 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  searchInput: { flex: 1, fontSize: 16, color: "#333", padding: 0 },
  resultsList: { paddingHorizontal: 20, paddingBottom: 32 },
  emptyState: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, color: "#bbb" },
});
