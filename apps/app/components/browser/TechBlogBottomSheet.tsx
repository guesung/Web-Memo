import { X } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  Modal,
  Pressable,
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
import { BLOG_LOGO_BASE_URL, TECH_BLOGS, type TechBlog } from "./techBlogData";

const SCREEN_HEIGHT = Dimensions.get("window").height;
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.7;
const NUM_COLUMNS = 4;

function SheetBlogItem({
  blog,
  onPress,
}: { blog: TechBlog; onPress: (url: string) => void }) {
  const [imgError, setImgError] = useState(false);
  const logoUri = `${BLOG_LOGO_BASE_URL}${blog.logo}`;

  return (
    <TouchableOpacity
      style={styles.blogItem}
      onPress={() => onPress(blog.url)}
      activeOpacity={0.7}
    >
      <View style={styles.logoContainer}>
        {imgError ? (
          <View style={styles.logoFallback}>
            <Text style={styles.logoFallbackText}>
              {blog.name.charAt(0)}
            </Text>
          </View>
        ) : (
          <Image
            source={{ uri: logoUri }}
            style={styles.logoImage}
            onError={() => setImgError(true)}
            resizeMode="contain"
          />
        )}
      </View>
      <Text style={styles.blogName} numberOfLines={1}>
        {blog.name}
      </Text>
    </TouchableOpacity>
  );
}

export function TechBlogBottomSheet({
  visible,
  onClose,
  onSelectBlog,
}: {
  visible: boolean;
  onClose: () => void;
  onSelectBlog: (url: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(SHEET_HEIGHT);
  const opacity = useSharedValue(0);
  const [modalVisible, setModalVisible] = useState(false);

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

  const renderItem = useCallback(
    ({ item }: { item: TechBlog }) => (
      <SheetBlogItem blog={item} onPress={onSelectBlog} />
    ),
    [onSelectBlog],
  );

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

          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>테크 블로그</Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <X size={22} color="#666" />
            </TouchableOpacity>
          </View>

          <FlatList
            data={TECH_BLOGS}
            renderItem={renderItem}
            keyExtractor={(item) => item.url}
            numColumns={NUM_COLUMNS}
            contentContainerStyle={styles.gridContent}
            columnWrapperStyle={styles.gridRow}
            showsVerticalScrollIndicator={false}
          />
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
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
  },
  gridContent: {
    paddingHorizontal: 12,
    paddingBottom: 20,
  },
  gridRow: {
    marginBottom: 16,
  },
  blogItem: {
    flex: 1,
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 4,
  },
  logoContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  logoImage: {
    width: 36,
    height: 36,
    borderRadius: 4,
  },
  logoFallback: {
    width: 36,
    height: 36,
    borderRadius: 4,
    backgroundColor: "#e0e0e0",
    justifyContent: "center",
    alignItems: "center",
  },
  logoFallbackText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#666",
  },
  blogName: {
    fontSize: 11,
    color: "#555",
    textAlign: "center",
    lineHeight: 14,
  },
});
