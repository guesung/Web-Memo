import { FileText, Globe, HeartOff, X } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
  Dimensions,
  Image,
  Modal,
  Pressable,
  ScrollView,
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
      <View className="flex-1 justify-end">
        <Animated.View className="absolute inset-0 bg-black/40" style={overlayStyle}>
          <Pressable className="absolute inset-0" onPress={onClose} />
        </Animated.View>

        <Animated.View
          className="bg-white rounded-t-[20px]"
          style={[sheetStyle, { height: SHEET_HEIGHT, paddingBottom: insets.bottom + 16 }]}
        >
          <View className="items-center py-2.5">
            <View className="w-9 h-1 rounded-sm bg-gray-300" />
          </View>

          <View className="flex-row items-center justify-between px-5 pb-3 gap-2">
            {favIconUrl ? (
              <Image
                source={{ uri: favIconUrl }}
                style={{ width: 14, height: 14, borderRadius: 2 }}
              />
            ) : (
              <FileText size={14} color="#666" />
            )}
            <TouchableOpacity
              className="flex-1"
              onPress={handleNavigate}
              activeOpacity={0.7}
            >
              <Text className="text-base font-semibold text-foreground" numberOfLines={1}>
                {title}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <X size={22} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView
            className="flex-1 px-5"
            contentContainerStyle={{ paddingBottom: 12 }}
            showsVerticalScrollIndicator={false}
          >
            <Text className="text-[15px] text-[#333] leading-[22px]">{memoText}</Text>
          </ScrollView>

          <View className="flex-row items-center justify-between px-5 pt-2 pb-1">
            <View className="flex-row items-center gap-2">
              {domain ? (
                <View className="flex-row items-center gap-1">
                  <Globe size={11} color="#999" />
                  <Text className="text-xs text-muted-foreground">{domain}</Text>
                </View>
              ) : null}
              {formattedDate ? (
                <Text className="text-xs text-muted-foreground">{formattedDate}</Text>
              ) : null}
            </View>
          </View>

          {isWish ? (
            <TouchableOpacity
              className="flex-row items-center justify-center gap-1.5 mx-5 mt-2 py-2.5 border border-wish rounded-lg"
              onPress={handleWishRemove}
              activeOpacity={0.7}
            >
              <HeartOff size={14} color="#ec4899" />
              <Text className="text-sm text-wish font-medium">위시리스트에서 제거</Text>
            </TouchableOpacity>
          ) : null}
        </Animated.View>
      </View>
    </Modal>
  );
}
