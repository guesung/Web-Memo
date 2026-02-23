import { MemoCard, type MemoItem } from "@/components/memo/MemoCard";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useLocalMemos } from "@/lib/hooks/useLocalMemos";
import { useMemosInfinite } from "@/lib/hooks/useMemos";
import { Search as SearchIcon } from "lucide-react-native";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
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
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      <View className="px-5 pt-4 pb-1">
        <Text className="text-[22px] font-extrabold text-foreground tracking-tight">검색</Text>
      </View>

      <View className="px-5 mt-3 mb-5">
        <View className="flex-row items-center bg-input rounded-[14px] px-3.5 py-3 gap-2.5">
          <SearchIcon size={18} color="#999" />
          <TextInput
            className="flex-1 text-base text-[#333] p-0"
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
        <View className="items-center pt-[60px] gap-3">
          <SearchIcon size={48} color="#ddd" />
          <Text className="text-[15px] text-gray-300">메모를 검색해보세요</Text>
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
          contentContainerClassName="px-5 pb-8"
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isFetchingNextPage ? <ActivityIndicator style={{ paddingVertical: 16 }} /> : null
          }
        />
      ) : (
        <View className="items-center pt-[60px] gap-3">
          <Text className="text-[15px] text-gray-300">검색 결과가 없습니다</Text>
        </View>
      )}
    </View>
  );
}
