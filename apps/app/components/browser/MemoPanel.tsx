import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Save, Check } from "lucide-react-native";
import { useMemoUpsertMutation } from "@/lib/hooks/useMemoMutation";
import { MemoService } from "@web-memo/shared/utils/services";
import { supabase } from "@/lib/supabase/client";

interface MemoPanelProps {
  url: string;
  pageTitle: string;
}

const memoService = new MemoService(supabase);

export function MemoPanel({ url, pageTitle }: MemoPanelProps) {
  const [memoText, setMemoText] = useState("");
  const [saved, setSaved] = useState(false);
  const { mutate, isPending } = useMemoUpsertMutation();

  useEffect(() => {
    if (!url) return;
    setSaved(false);

    memoService.getMemoByUrl(url).then(({ data }) => {
      if (data && data.length > 0 && data[0].memo) {
        setMemoText(data[0].memo);
      } else {
        setMemoText("");
      }
    });
  }, [url]);

  const handleSave = () => {
    if (!memoText.trim()) return;

    mutate(
      {
        url,
        title: pageTitle || url,
        memo: memoText.trim(),
      },
      {
        onSuccess: () => {
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        },
      }
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Memo</Text>
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
            {saved ? "Saved" : "Save"}
          </Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.textInput}
        placeholder="Write a memo about this page..."
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
    flex: 0.35,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    backgroundColor: "#fff",
    padding: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111",
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
