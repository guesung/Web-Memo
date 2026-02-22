import type { LocalMemo } from "@/lib/storage/localMemo";
import type { GetMemoResponse } from "@web-memo/shared/types";
import { FileText, Globe, Heart, Trash2 } from "lucide-react-native";
import { useRef } from "react";
import { Animated, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Swipeable } from "react-native-gesture-handler";

export type MemoItem = LocalMemo | GetMemoResponse;

interface MemoCardProps {
  memo: MemoItem;
  onPress: () => void;
  onDelete?: () => void;
}

export function MemoCard({ memo, onPress, onDelete }: MemoCardProps) {
  const swipeableRef = useRef<Swipeable>(null);
  const url = memo.url;
  let domain = "";
  try {
    if (url) domain = new URL(url).hostname.replace("www.", "");
  } catch {}

  const title = memo.title || "Untitled";
  const memoText = memo.memo;
  const favIconUrl = "favIconUrl" in memo ? memo.favIconUrl : undefined;
  const isWish = "isWish" in memo ? memo.isWish : false;

  const renderRightActions = (_progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>) => {
    const scale = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [1, 0.5],
      extrapolate: "clamp",
    });

    return (
      <TouchableOpacity
        style={styles.deleteAction}
        onPress={() => {
          swipeableRef.current?.close();
          onDelete?.();
        }}
        activeOpacity={0.7}
      >
        <Animated.View style={[styles.deleteContent, { transform: [{ scale }] }]}>
          <Trash2 size={18} color="#fff" />
          <Text style={styles.deleteText}>삭제</Text>
        </Animated.View>
      </TouchableOpacity>
    );
  };

  const card = (
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
        <Text style={styles.memoCardText} numberOfLines={10}>
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

  if (!onDelete) return card;

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      overshootRight={false}
      rightThreshold={40}
    >
      {card}
    </Swipeable>
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
  deleteAction: {
    backgroundColor: "#ef4444",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    width: 72,
    marginBottom: 10,
    marginLeft: 8,
  },
  deleteContent: {
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  deleteText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
});
