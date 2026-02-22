import { FileText, Globe, HeartOff, X } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
  Dimensions,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { MemoItem } from "@/components/memo/MemoCard";

const SCREEN_HEIGHT = Dimensions.get("window").height;
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.6;

interface MemoDetailModalProps {
  memo: MemoItem | null;
  onClose: () => void;
  onNavigate: (url: string) => void;
  onWishRemove?: (memo: MemoItem) => void;
}

export function MemoDetailModal({
  memo,
  onClose,
  onNavigate,
  onWishRemove,
}: MemoDetailModalProps) {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(SHEET_HEIGHT);
  const opacity = useSharedValue(0);
  const [modalVisible, setModalVisible] = useState(false);

  const visible = memo !== null;

  useEffect(() => {
    if (visible) {
      setModalVisible(true);
      translateY.value = withTiming(0, { duration: 300 });
      opacity.value = withTiming(1, { duration: 300 });
    } else {
      translateY.value = withTiming(SHEET_HEIGHT, { duration: 250 });
      opacity.value = withTiming(0, { duration: 250 });
      const timer = setTimeout(() => setModalVisible(false), 260);
      return () => clearTimeout(timer);
    }
  }, [visible, translateY, opacity]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const handleNavigate = useCallback(() => {
    if (memo?.url) {
      onNavigate(memo.url);
    }
  }, [memo, onNavigate]);

  const handleWishRemove = useCallback(() => {
    if (memo && onWishRemove) {
      onWishRemove(memo);
    }
  }, [memo, onWishRemove]);

  const title = memo?.title || "Untitled";
  const memoText = memo?.memo ?? "";
  const favIconUrl = memo && "favIconUrl" in memo ? memo.favIconUrl : undefined;
  const isWish = memo && "isWish" in memo ? memo.isWish : false;

  let domain = "";
  try {
    if (memo?.url) domain = new URL(memo.url).hostname.replace("www.", "");
  } catch {}

  let formattedDate = "";
  if (memo) {
    const rawDate = "created_at" in memo ? memo.created_at : memo.createdAt;
    if (rawDate) {
      const d = new Date(rawDate);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      formattedDate = `${yyyy}.${mm}.${dd}`;
    }
  }

  return (
    <Modal visible={modalVisible} transparent statusBarTranslucent>
      <View style={styles.modalContainer}>
        <Animated.View style={[styles.overlay, overlayStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            sheetStyle,
            { paddingBottom: insets.bottom + 16 },
          ]}
        >
          <View style={styles.dragHandle}>
            <View style={styles.dragHandleBar} />
          </View>

          <View style={styles.header}>
            {favIconUrl ? (
              <Image source={{ uri: favIconUrl }} style={styles.favicon} />
            ) : (
              <FileText size={14} color="#666" />
            )}
            <TouchableOpacity
              style={styles.titleContainer}
              onPress={handleNavigate}
              activeOpacity={0.7}
            >
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <X size={22} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.memoText}>{memoText}</Text>
          </ScrollView>

          <View style={styles.footer}>
            <View style={styles.footerLeft}>
              {domain ? (
                <View style={styles.domainRow}>
                  <Globe size={11} color="#999" />
                  <Text style={styles.domainText}>{domain}</Text>
                </View>
              ) : null}
              {formattedDate ? (
                <Text style={styles.dateText}>{formattedDate}</Text>
              ) : null}
            </View>
          </View>

          {isWish ? (
            <TouchableOpacity
              style={styles.wishRemoveButton}
              onPress={handleWishRemove}
              activeOpacity={0.7}
            >
              <HeartOff size={14} color="#ec4899" />
              <Text style={styles.wishRemoveText}>위시리스트에서 제거</Text>
            </TouchableOpacity>
          ) : null}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  sheet: {
    height: SHEET_HEIGHT,
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  dragHandle: {
    alignItems: "center",
    paddingVertical: 10,
  },
  dragHandleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#d1d5db",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 8,
  },
  favicon: {
    width: 14,
    height: 14,
    borderRadius: 2,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111",
  },
  body: {
    flex: 1,
    paddingHorizontal: 20,
  },
  bodyContent: {
    paddingBottom: 12,
  },
  memoText: {
    fontSize: 15,
    color: "#333",
    lineHeight: 22,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  footerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  domainRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  domainText: {
    fontSize: 12,
    color: "#999",
  },
  dateText: {
    fontSize: 12,
    color: "#999",
  },
  wishRemoveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginHorizontal: 20,
    marginTop: 8,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#ec4899",
    borderRadius: 8,
  },
  wishRemoveText: {
    fontSize: 14,
    color: "#ec4899",
    fontWeight: "500",
  },
});
