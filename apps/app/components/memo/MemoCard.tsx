import { TouchableOpacity, Text, View, StyleSheet } from "react-native";
import { FileText, Globe } from "lucide-react-native";
import type { GetMemoResponse } from "@web-memo/shared/types";

interface MemoCardProps {
  memo: GetMemoResponse;
  onPress?: () => void;
}

export function MemoCard({ memo, onPress }: MemoCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR", {
      month: "short",
      day: "numeric",
    });
  };

  let domain = "";
  try {
    if (memo.url) domain = new URL(memo.url).hostname.replace("www.", "");
  } catch {}


  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <FileText size={16} color="#666" />
        <Text style={styles.title} numberOfLines={1}>
          {memo.title || "Untitled"}
        </Text>
        {memo.updated_at ? (
          <Text style={styles.date}>{formatDate(memo.updated_at)}</Text>
        ) : null}
      </View>

      {memo.memo ? (
        <Text style={styles.memoText} numberOfLines={2}>
          {memo.memo}
        </Text>
      ) : null}

      {domain ? (
        <View style={styles.urlRow}>
          <Globe size={12} color="#999" />
          <Text style={styles.domain} numberOfLines={1}>
            {domain}
          </Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#111",
  },
  date: {
    fontSize: 12,
    color: "#999",
  },
  memoText: {
    fontSize: 14,
    color: "#555",
    lineHeight: 20,
    marginBottom: 6,
  },
  urlRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  domain: {
    fontSize: 12,
    color: "#999",
  },
});
