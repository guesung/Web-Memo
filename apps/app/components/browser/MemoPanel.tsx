import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
  Platform,
  Image,
} from "react-native";
import { Save, Check, ChevronDown, FileText } from "lucide-react-native";
import {
  useLocalMemoByUrl,
  useLocalMemoUpsert,
} from "@/lib/hooks/useLocalMemos";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useSupabaseMemoByUrl } from "@/lib/hooks/useMemoByUrl";
import { useMemoUpsertMutation } from "@/lib/hooks/useMemoMutation";

interface MemoPanelProps {
  url: string;
  pageTitle: string;
  favIconUrl?: string;
}

export function MemoPanel({ url, pageTitle, favIconUrl }: MemoPanelProps) {
  const { session } = useAuth();
  const isLoggedIn = !!session;

  const [memoText, setMemoText] = useState("");
  const [saved, setSaved] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  const { data: localMemo } = useLocalMemoByUrl(url);
  const { data: supabaseMemo } = useSupabaseMemoByUrl(url, isLoggedIn);
  const existingMemo = isLoggedIn
    ? (supabaseMemo ? { memo: supabaseMemo.memo } : null)
    : localMemo;

  const { mutate: localMutate, isPending: isLocalPending } = useLocalMemoUpsert();
  const { mutate: supabaseMutate, isPending: isSupabasePending } = useMemoUpsertMutation();
  const isPending = isLoggedIn ? isSupabasePending : isLocalPending;

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, () => setIsKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setIsKeyboardVisible(false));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (existingMemo?.memo) {
      setMemoText(existingMemo.memo);
    } else {
      setMemoText("");
    }
    setSaved(false);
  }, [existingMemo?.memo, url]);

  const onSaveSuccess = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSave = () => {
    if (!memoText.trim()) return;

    if (isLoggedIn) {
      const payload = { url, title: pageTitle || url, memo: memoText.trim(), favIconUrl: favIconUrl ?? null };
      supabaseMutate(payload, { onSuccess: onSaveSuccess });
    } else {
      const payload = { url, title: pageTitle || url, memo: memoText.trim(), favIconUrl };
      localMutate(payload, { onSuccess: onSaveSuccess });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTitle}>
          {favIconUrl ? (
            <Image source={{ uri: favIconUrl }} style={styles.headerFavicon} />
          ) : (
            <FileText size={14} color="#666" />
          )}
          <Text style={styles.title} numberOfLines={1}>{pageTitle || "메모"}</Text>
        </View>
        <View style={styles.headerActions}>
          {isKeyboardVisible && (
            <TouchableOpacity
              style={styles.keyboardDismissButton}
              onPress={() => Keyboard.dismiss()}
            >
              <ChevronDown size={16} color="#666" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.saveButton, saved && styles.savedButton]}
            onPress={handleSave}
            disabled={isPending || !memoText.trim()}
          >
            {isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : saved ? (
              <Check size={16} color="#fff" />
            ) : (
              <Save size={16} color="#fff" />
            )}
            <Text style={styles.saveText}>
              {saved ? "저장됨" : "저장"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <TextInput
        style={styles.textInput}
        placeholder="이 페이지에 대한 메모를 작성하세요..."
        value={memoText}
        onChangeText={setMemoText}
        multiline
        textAlignVertical="top"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111",
    flex: 1,
  },
  headerTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
    marginRight: 8,
  },
  headerFavicon: {
    width: 14,
    height: 14,
    borderRadius: 2,
  },
  keyboardDismissButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#111",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  savedButton: {
    backgroundColor: "#22c55e",
  },
  saveText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: "#333",
    lineHeight: 22,
  },
});
