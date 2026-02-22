import { SocialLoginButton } from "@/components/auth/SocialLoginButton";
import { useOAuth } from "@/lib/auth/useOAuth";
import { Sparkles } from "lucide-react-native";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  View
} from "react-native";

export default function LoginScreen() {
  const { signInWithGoogle, signInWithKakao, signInWithApple, isAppleAvailable } = useOAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (provider: "google" | "kakao" | "apple") => {
    try {
      setIsLoading(true);
      if (provider === "google") {
        await signInWithGoogle();
      } else if (provider === "kakao") {
        await signInWithKakao();
      } else {
        await signInWithApple();
      }
    } catch (error) {
      console.error("로그인 에러:", error);
      Alert.alert("로그인 실패", String(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.iconBox}>
            <Sparkles size={32} color="#fff" />
          </View>
          <Text style={styles.title}>Web Memo</Text>
          <Text style={styles.subtitle}>
            웹을 탐색하고 메모를 쉽게 저장하세요
          </Text>
        </View>

        <View style={styles.buttons}>
          {isAppleAvailable && (
            <SocialLoginButton
              provider="apple"
              onPress={() => handleLogin("apple")}
              disabled={isLoading}
            />
          )}
          <SocialLoginButton
            provider="kakao"
            onPress={() => handleLogin("kakao")}
            disabled={isLoading}
          />
          <SocialLoginButton
            provider="google"
            onPress={() => handleLogin("google")}
            disabled={isLoading}
          />
          {isLoading && (
            <ActivityIndicator size="small" style={styles.loading} />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
    gap: 12,
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#7c3aed",
    shadowColor: "#7c3aed",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    marginBottom: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111",
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  buttons: {
    gap: 12,
  },
  loading: {
    marginTop: 16,
  },
});
