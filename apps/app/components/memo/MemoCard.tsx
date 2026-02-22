import type { LocalMemo } from "@/lib/storage/localMemo";
import type { GetMemoResponse } from "@web-memo/shared/types";
import { FileText, Globe, Heart } from "lucide-react-native";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export type MemoItem = LocalMemo | GetMemoResponse;

interface MemoCardProps {
  memo: MemoItem;
  onPress: () => void;
}

export function MemoCard({ memo, onPress }: MemoCardProps) {
  const url = memo.url;
  let domain = "";
  try {
    if (url) domain = new URL(url).hostname.replace("www.", "");
  } catch {}

  const title = memo.title || "Untitled";
  const memoText = memo.memo;
  const favIconUrl = "favIconUrl" in memo ? memo.favIconUrl : undefined;
  const isWish = "isWish" in memo ? memo.isWish : false;

  return (
    <TouchableOpacity style={styles.memoCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.memoCardHeader}>
        {favIconUrl ? (
          <Image source={{ uri: favIconUrl }} style={styles.favicon} />
        ) : (
          <FileText size={14} color="#666" />
        )}
        <Text style={styles.memoCardTitle} numberOfLines={1}>
          {title}
        </Text>
        {isWish ? <Heart size={12} fill="#ec4899" color="#ec4899" /> : null}
      </View>
      {memoText ? (
        <Text style={styles.memoCardText} numberOfLines={2}>
          {memoText}
        </Text>
      ) : null}
      {domain ? (
        <View style={styles.memoCardFooter}>
          <Globe size={11} color="#999" />
          <Text style={styles.memoCardDomain}>{domain}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  memoCard: {
    backgroundColor: "#fafafa",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  favicon: { width: 14, height: 14, borderRadius: 2 },
  memoCardHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  memoCardTitle: { flex: 1, fontSize: 15, fontWeight: "600", color: "#111" },
  memoCardText: { fontSize: 14, color: "#555", lineHeight: 20, marginBottom: 6 },
  memoCardFooter: { flexDirection: "row", alignItems: "center", gap: 4 },
  memoCardDomain: { fontSize: 12, color: "#999" },
});
