import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Keyboard,
} from "react-native";
import { useRouter } from "expo-router";
import { Search, ArrowRight } from "lucide-react-native";
import { useMemosInfinite } from "@/lib/hooks/useMemos";
import { MemoCard } from "@/components/memo/MemoCard";

export default function HomeScreen() {
  const [urlInput, setUrlInput] = useState("");
  const router = useRouter();
  const { data, isLoading } = useMemosInfinite();

  const recentMemos = data?.pages.flatMap((page) => page.data).slice(0, 5) ?? [];

  const handleNavigate = () => {
    if (!urlInput.trim()) return;
    Keyboard.dismiss();
    let url = urlInput.trim();
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = `https://${url}`;
    }
    router.push(`/browser/${encodeURIComponent(url)}`);
    setUrlInput("");
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Search size={20} color="#999" />
        <TextInput
          style={styles.searchInput}
          placeholder="Enter URL to browse..."
          value={urlInput}
          onChangeText={setUrlInput}
          onSubmitEditing={handleNavigate}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          returnKeyType="go"
        />
        <TouchableOpacity onPress={handleNavigate}>
          <ArrowRight size={20} color="#111" />
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Recent Memos</Text>

      {isLoading ? (
        <Text style={styles.emptyText}>Loading...</Text>
      ) : recentMemos.length === 0 ? (
        <Text style={styles.emptyText}>No memos yet. Start browsing!</Text>
      ) : (
        <FlatList
          data={recentMemos}
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
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#111",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111",
    marginHorizontal: 16,
    marginBottom: 8,
  },
  list: {
    paddingHorizontal: 16,
  },
  emptyText: {
    textAlign: "center",
    color: "#999",
    marginTop: 24,
    fontSize: 14,
  },
});
