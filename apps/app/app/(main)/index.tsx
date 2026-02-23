import { MemoCard, type MemoItem } from "@/components/memo/MemoCard";
import { MemoDetailModal } from "@/components/memo/MemoDetailModal";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useLocalMemoDelete, useLocalMemos, useLocalMemoUpsert, useLocalMemoWishToggle } from "@/lib/hooks/useLocalMemos";
import { useDeleteMemoMutation, useMemoUpsertMutation, useMemoWishToggleMutation } from "@/lib/hooks/useMemoMutation";
import { useMemosInfinite } from "@/lib/hooks/useMemos";
import { Globe, Heart, Undo2 } from "lucide-react-native";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

export default function MemoScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session } = useAuth();
  const isLoggedIn = !!session;
  const [filter, setFilter] = useState<"all" | "wish">("all");
  const [selectedMemo, setSelectedMemo] = useState<MemoItem | null>(null);

  const wishToggleLocal = useLocalMemoWishToggle();
  const wishToggleSupabase = useMemoWishToggleMutation();
  const deleteLocal = useLocalMemoDelete();
  const deleteSupabase = useDeleteMemoMutation();
  const upsertLocal = useLocalMemoUpsert();
  const upsertSupabase = useMemoUpsertMutation();

  const [deletedMemo, setDeletedMemo] = useState<MemoItem | null>(null);
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleDelete = useCallback((item: MemoItem) => {
    if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
    setDeletedMemo(item);
    if (isLoggedIn) {
      deleteSupabase.mutate(item.id as number);
    } else {
      deleteLocal.mutate(item.id as string);
    }
    deleteTimerRef.current = setTimeout(() => setDeletedMemo(null), 3000);
  }, [isLoggedIn, deleteSupabase, deleteLocal]);

  const handleUndo = useCallback(() => {
    if (!deletedMemo) return;
    if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
    if (isLoggedIn) {
      const m = deletedMemo as import("@web-memo/shared/types").GetMemoResponse;
      upsertSupabase.mutate({
        url: m.url,
        title: m.title,
        memo: m.memo ?? "",
        favIconUrl: m.favIconUrl ?? undefined,
        isWish: m.isWish ?? false,
      });
    } else {
      const m = deletedMemo as import("@/lib/storage/localMemo").LocalMemo;
      upsertLocal.mutate({
        url: m.url,
        title: m.title,
        memo: m.memo,
        favIconUrl: m.favIconUrl,
        isWish: m.isWish,
      });
    }
    setDeletedMemo(null);
  }, [deletedMemo, isLoggedIn, upsertSupabase, upsertLocal]);

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
  } = useMemosInfinite(
    isLoggedIn ? { isWish: filter === "wish" } : undefined
  );

  const memos: MemoItem[] = isLoggedIn
    ? (supabaseMemosData?.pages.flatMap((p) => p.data) ?? [])
    : (localMemosData ?? []).filter((m) => (filter === "wish" ? m.isWish : !m.isWish));
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

        <View style={styles.segmentContainer}>
          <TouchableOpacity
            style={[styles.segmentBtn, filter === "all" && styles.segmentBtnActive]}
            onPress={() => setFilter("all")}
          >
            <Text style={[styles.segmentText, filter === "all" && styles.segmentTextActive]}>
              전체
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentBtn, filter === "wish" && styles.segmentBtnActive]}
            onPress={() => setFilter("wish")}
          >
            <Heart size={12} fill={filter === "wish" ? "#fff" : "#666"} color={filter === "wish" ? "#fff" : "#666"} />
            <Text style={[styles.segmentText, filter === "wish" && styles.segmentTextActive]}>
              위시리스트
            </Text>
          </TouchableOpacity>
        </View>

        {/* Memos */}
        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} size="large" />
        ) : memos.length > 0 ? (
          <View style={styles.memosSection}>
            <Text style={styles.sectionTitle}>{filter === "wish" ? "위시리스트" : "최근 메모"}</Text>
            <FlatList
              data={memos}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <MemoCard
                  memo={item}
                  onPress={() => setSelectedMemo(item)}
                  onDelete={() => handleDelete(item)}
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
            {filter === "wish" ? (
              <Heart size={48} color="#ddd" />
            ) : (
              <Globe size={48} color="#ddd" />
            )}
            <Text style={styles.emptyText}>
              {filter === "wish" ? "위시리스트가 비어있습니다" : "저장된 메모가 없습니다"}
            </Text>
            <Text style={styles.emptySubText}>
              {filter === "wish"
                ? "브라우저에서 마음에 드는 페이지를 저장해보세요"
                : "브라우저에서 웹서핑하며 메모를 남겨보세요"}
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => router.navigate("/(main)/browser")}
            >
              <Text style={styles.emptyButtonText}>
                {filter === "wish" ? "브라우저에서 페이지 저장하기" : "브라우저에서 웹서핑 시작하기"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <MemoDetailModal
        memo={selectedMemo}
        onClose={() => setSelectedMemo(null)}
        onNavigate={(url) => {
          setSelectedMemo(null);
          navigateToBrowser(url);
        }}
        onWishRemove={(memo) => {
          if (isLoggedIn) {
            const favIconUrl = "favIconUrl" in memo ? (memo.favIconUrl ?? undefined) : undefined;
            wishToggleSupabase.mutate({
              url: memo.url,
              title: memo.title,
              favIconUrl,
              currentIsWish: true,
            });
          } else {
            wishToggleLocal.mutate({ url: memo.url });
          }
          setSelectedMemo(null);
        }}
      />

      {deletedMemo ? (
        <View style={[styles.deleteToast, { bottom: insets.bottom + 24 }]}>
          <Text style={styles.deleteToastText}>메모가 삭제되었습니다</Text>
          <TouchableOpacity style={styles.undoBtn} onPress={handleUndo}>
            <Undo2 size={14} color="#60a5fa" />
            <Text style={styles.undoBtnText}>되돌리기</Text>
          </TouchableOpacity>
        </View>
      ) : null}
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
  emptyText: { fontSize: 16, fontWeight: "600", color: "#999" },
  emptySubText: { fontSize: 13, color: "#bbb" },
  emptyButton: {
    marginTop: 8,
    backgroundColor: "#111",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  emptyButtonText: { fontSize: 14, fontWeight: "600", color: "#fff" },
  segmentContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 8,
  },
  segmentBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
  },
  segmentBtnActive: {
    backgroundColor: "#111",
  },
  segmentText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
  },
  segmentTextActive: {
    color: "#fff",
  },
  deleteToast: {
    position: "absolute",
    left: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#333",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  deleteToastText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  undoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  undoBtnText: {
    color: "#60a5fa",
    fontSize: 14,
    fontWeight: "600",
  },
});
