import { ChevronRight } from "lucide-react-native";
import { useCallback, useState } from "react";
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { TechBlogBottomSheet } from "./TechBlogBottomSheet";
import {
  BLOG_LOGO_BASE_URL,
  QUICK_ACCESS_COUNT,
  TECH_BLOGS,
  type TechBlog,
} from "./techBlogData";

function BlogItem({
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

export function TechBlogLinks({
  onSelectBlog,
}: { onSelectBlog: (url: string) => void }) {
  const [isBottomSheetVisible, setIsBottomSheetVisible] = useState(false);

  const renderItem = useCallback(
    ({ item }: { item: TechBlog }) => (
      <BlogItem blog={item} onPress={onSelectBlog} />
    ),
    [onSelectBlog],
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>테크 블로그 바로가기</Text>
        <TouchableOpacity
          style={styles.viewAllBtn}
          onPress={() => setIsBottomSheetVisible(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.viewAllText}>전체보기</Text>
          <ChevronRight size={14} color="#999" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={TECH_BLOGS.slice(0, QUICK_ACCESS_COUNT)}
        renderItem={renderItem}
        keyExtractor={(item) => item.url}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />

      <TechBlogBottomSheet
        visible={isBottomSheetVisible}
        onClose={() => setIsBottomSheetVisible(false)}
        onSelectBlog={(url) => {
          setIsBottomSheetVisible(false);
          onSelectBlog(url);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 32,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
  },
  viewAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  viewAllText: {
    fontSize: 13,
    color: "#999",
  },
  listContent: {
    paddingHorizontal: 16,
    gap: 4,
  },
  blogItem: {
    width: 76,
    alignItems: "center",
    gap: 8,
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
