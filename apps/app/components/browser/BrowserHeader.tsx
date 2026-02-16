import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  X,
  ChevronLeft,
  ChevronRight,
  RotateCw,
} from "lucide-react-native";

interface BrowserHeaderProps {
  url: string;
  canGoBack: boolean;
  canGoForward: boolean;
  onGoBack: () => void;
  onGoForward: () => void;
  onReload: () => void;
  onClose: () => void;
}

export function BrowserHeader({
  url,
  canGoBack,
  canGoForward,
  onGoBack,
  onGoForward,
  onReload,
  onClose,
}: BrowserHeaderProps) {
  const insets = useSafeAreaInsets();

  let displayUrl = url;
  try {
    const parsed = new URL(url);
    displayUrl = parsed.hostname.replace("www.", "");
  } catch {}

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.row}>
        <TouchableOpacity onPress={onClose} style={styles.button}>
          <X size={20} color="#111" />
        </TouchableOpacity>

        <View style={styles.urlBar}>
          <Text style={styles.urlText} numberOfLines={1}>
            {displayUrl}
          </Text>
        </View>

        <View style={styles.navButtons}>
          <TouchableOpacity
            onPress={onGoBack}
            disabled={!canGoBack}
            style={styles.button}
          >
            <ChevronLeft size={20} color={canGoBack ? "#111" : "#ccc"} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onGoForward}
            disabled={!canGoForward}
            style={styles.button}
          >
            <ChevronRight
              size={20}
              color={canGoForward ? "#111" : "#ccc"}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={onReload} style={styles.button}>
            <RotateCw size={18} color="#111" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 4,
  },
  button: {
    padding: 8,
  },
  urlBar: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  urlText: {
    fontSize: 14,
    color: "#666",
  },
  navButtons: {
    flexDirection: "row",
    alignItems: "center",
  },
});
