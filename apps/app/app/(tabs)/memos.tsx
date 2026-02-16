import { View, Text, FlatList, StyleSheet, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { useMemosInfinite } from "@/lib/hooks/useMemos";
import { MemoCard } from "@/components/memo/MemoCard";

export default function MemosScreen() {
  const router = useRouter();
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage, refetch } =
    useMemosInfinite();

  const allMemos = data?.pages.flatMap((page) => page.data) ?? [];

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  return (
    <View style={styles.container}>
      {isLoading ? (
        <Text style={styles.emptyText}>Loading...</Text>
      ) : allMemos.length === 0 ? (
        <Text style={styles.emptyText}>No memos yet.</Text>
      ) : (
        <FlatList
          data={allMemos}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <MemoCard
              memo={item}
              onPress={() =>
                router.push(
                  `/browser/${encodeURIComponent(item.url ?? "")}`
                )
              }
            />
          )}
          contentContainerStyle={styles.list}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={refetch} />
          }
          ListFooterComponent={
            isFetchingNextPage ? (
              <Text style={styles.loadingMore}>Loading more...</Text>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  list: {
    padding: 16,
  },
  emptyText: {
    textAlign: "center",
    color: "#999",
    marginTop: 24,
    fontSize: 14,
  },
  loadingMore: {
    textAlign: "center",
    color: "#999",
    paddingVertical: 16,
    fontSize: 14,
  },
});
