import { useState } from "react";
import { ActivityIndicator, Image, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useOAuth } from "@/lib/auth/useOAuth";
import { SocialLoginButton } from "./_components/SocialLoginButton";
import type { Provider } from "./_types/provider";

export default function LoginScreen() {
	const {
		signInWithGoogle,
		signInWithKakao,
		signInWithApple,
		isAppleAvailable,
	} = useOAuth();
	const [isLoading, setIsLoading] = useState(false);

	const handleLogin = async (provider: Provider) => {
		try {
			setIsLoading(true);
			switch (provider) {
				case "google":
					await signInWithGoogle();
					break;
				case "kakao":
					await signInWithKakao();
					break;
				case "apple":
					await signInWithApple();
					break;
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
					<Image
						source={require("@/assets/icon.png")}
						style={{ width: 64, height: 64 }}
						resizeMode="contain"
					/>
					<Text className="text-2xl font-bold text-foreground">웹 메모</Text>
					<Text className="text-sm text-gray-500 text-center">
						아티클 읽으며 간편하게 메모하세요.
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
					{isLoading && <ActivityIndicator size="small" className="mt-4" />}
				</View>
			</View>
		</SafeAreaView>
	);
}
