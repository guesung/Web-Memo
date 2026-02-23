import { SocialLoginButton } from "@/components/auth/SocialLoginButton";
import { useOAuth } from "@/lib/auth/useOAuth";
import { Sparkles } from "lucide-react-native";
import { useState } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
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
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 justify-center px-8">
        <View className="items-center mb-10 gap-3">
          <View
            className="w-16 h-16 rounded-2xl items-center justify-center bg-accent mb-1"
            style={{
              shadowColor: "#7c3aed",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 8,
            }}
          >
            <Sparkles size={32} color="#fff" />
          </View>
          <Text className="text-2xl font-bold text-foreground">Web Memo</Text>
          <Text className="text-sm text-gray-500 text-center">
            웹을 탐색하고 메모를 쉽게 저장하세요
          </Text>
        </View>

        <View className="gap-3">
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
            <ActivityIndicator size="small" className="mt-4" />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
