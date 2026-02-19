import { useState } from "react";
import { View, Text, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useOAuth } from "@/lib/auth/useOAuth";
import { SocialLoginButton } from "@/components/auth/SocialLoginButton";

export default function LoginScreen() {
  const { signInWithGoogle, signInWithKakao } = useOAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (provider: "google" | "kakao") => {
    try {
      setIsLoading(true);
      if (provider === "google") {
        await signInWithGoogle();
      } else {
        await signInWithKakao();
      }
    } catch (error) {
      Alert.alert("Login Failed", "Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Web Memo</Text>
          <Text style={styles.subtitle}>
            Browse the web and save memos easily
          </Text>
        </View>

        <View style={styles.buttons}>
          <SocialLoginButton
            provider="google"
            onPress={() => handleLogin("google")}
            disabled={isLoading}
          />
          <SocialLoginButton
            provider="kakao"
            onPress={() => handleLogin("kakao")}
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
    paddingHorizontal: 24,
  },
  header: {
    alignItems: "center",
    marginBottom: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#111",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
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
