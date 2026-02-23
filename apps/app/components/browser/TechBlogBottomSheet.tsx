import { MessageCircle, X } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  Dimensions,
  Image,
  Linking,
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
import { BLOG_AGGREGATORS, BLOG_LOGO_BASE_URL, TECH_BLOGS, type TechBlog } from "./techBlogData";

const SCREEN_HEIGHT = Dimensions.get("window").height;
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.7;
const NUM_COLUMNS = 4;

function SheetBlogItem({
  blog,
  onPress,
}: { blog: TechBlog; onPress: (url: string) => void }) {
  const [imgError, setImgError] = useState(false);
  const logoUri = blog.logo
    ? (blog.logo.startsWith("http") ? blog.logo : `${BLOG_LOGO_BASE_URL}${blog.logo}`)
    : "";

  return (
    <TouchableOpacity
      style={styles.blogItem}
      onPress={() => onPress(blog.url)}
      activeOpacity={0.7}
    >
      <View style={styles.logoContainer}>
        {!logoUri || imgError ? (
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

function BlogGrid({ blogs, onPress }: { blogs: TechBlog[]; onPress: (url: string) => void }) {
  const rows: TechBlog[][] = [];
  for (let i = 0; i < blogs.length; i += NUM_COLUMNS) {
    rows.push(blogs.slice(i, i + NUM_COLUMNS));
  }

  return (
    <View>
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.gridRow}>
          {row.map((blog) => (
            <SheetBlogItem key={blog.url} blog={blog} onPress={onPress} />
          ))}
          {row.length < NUM_COLUMNS &&
            Array.from({ length: NUM_COLUMNS - row.length }).map((_, i) => (
              <View key={`empty-${i}`} style={styles.blogItem} />
            ))}
        </View>
      ))}
    </View>
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
            <Text style={styles.sheetTitle}>바로가기</Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <X size={22} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            <Text style={styles.sectionTitle}>블로그 모음</Text>
            <BlogGrid blogs={BLOG_AGGREGATORS} onPress={onSelectBlog} />

            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>테크 블로그</Text>
            <BlogGrid blogs={TECH_BLOGS} onPress={onSelectBlog} />

            <TouchableOpacity
              style={styles.inquiryBtn}
              onPress={() => Linking.openURL("https://open.kakao.com/o/sido56Pg")}
              activeOpacity={0.7}
            >
              <MessageCircle size={16} color="#666" />
              <Text style={styles.inquiryText}>블로그 추가 문의하기</Text>
            </TouchableOpacity>
          </ScrollView>
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
  scrollContent: {
    paddingHorizontal: 12,
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    paddingHorizontal: 8,
    marginBottom: 12,
  },
  gridRow: {
    flexDirection: "row",
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
  inquiryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 24,
    paddingVertical: 12,
    marginHorizontal: 8,
    borderRadius: 12,
    backgroundColor: "#f5f5f5",
  },
  inquiryText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
});
