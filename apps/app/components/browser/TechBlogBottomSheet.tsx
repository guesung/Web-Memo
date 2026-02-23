import { MessageCircle, X } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  Dimensions,
  Image,
  Linking,
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
      className="flex-1 items-center gap-2 px-1"
      onPress={() => onPress(blog.url)}
      activeOpacity={0.7}
    >
      <View className="w-14 h-14 rounded-[14px] bg-input justify-center items-center overflow-hidden">
        {!logoUri || imgError ? (
          <View
            className="justify-center items-center bg-[#e0e0e0]"
            style={{ width: 36, height: 36, borderRadius: 4 }}
          >
            <Text className="text-base font-bold text-gray-500">
              {blog.name.charAt(0)}
            </Text>
          </View>
        ) : (
          <Image
            source={{ uri: logoUri }}
            style={{ width: 36, height: 36, borderRadius: 4 }}
            onError={() => setImgError(true)}
            resizeMode="contain"
          />
        )}
      </View>
      <Text className="text-[11px] text-secondary-foreground text-center leading-[14px]" numberOfLines={1}>
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
        <View key={rowIndex} className="flex-row mb-4">
          {row.map((blog) => (
            <SheetBlogItem key={blog.url} blog={blog} onPress={onPress} />
          ))}
          {row.length < NUM_COLUMNS &&
            Array.from({ length: NUM_COLUMNS - row.length }).map((_, i) => (
              <View key={`empty-${i}`} className="flex-1 items-center gap-2 px-1" />
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

          <View className="flex-row justify-between items-center px-5 pb-4">
            <Text className="text-lg font-bold text-foreground">바로가기</Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <X size={22} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 20 }}>
            <Text className="text-sm font-semibold text-gray-500 px-2 mb-3">블로그 모음</Text>
            <BlogGrid blogs={BLOG_AGGREGATORS} onPress={onSelectBlog} />

            <Text className="text-sm font-semibold text-gray-500 px-2 mb-3 mt-6">테크 블로그</Text>
            <BlogGrid blogs={TECH_BLOGS} onPress={onSelectBlog} />

            <TouchableOpacity
              className="flex-row items-center justify-center gap-1.5 mt-6 py-3 mx-2 rounded-xl bg-input"
              onPress={() => Linking.openURL("https://open.kakao.com/o/sido56Pg")}
              activeOpacity={0.7}
            >
              <MessageCircle size={16} color="#666" />
              <Text className="text-sm text-gray-500 font-medium">블로그 추가 문의하기</Text>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}
