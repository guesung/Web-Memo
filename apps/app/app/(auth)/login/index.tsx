import { useState } from "react";
import { ActivityIndicator, Image, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
	setAnalyticsUserId,
	trackAppEvent,
} from "@/lib/analytics/appAnalytics";
import { useOAuth } from "@/lib/auth/useOAuth";
import { supabase } from "@/lib/supabase/client";
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
			// AnalyticsUserSync effect보다 먼저 user_id를 넣어야 본인 제외 게이트가 걸린다.
			const {
				data: { session },
			} = await supabase.auth.getSession();
			if (session) {
				setAnalyticsUserId(session.user.id);
				void trackAppEvent({ name: "login", params: { method: provider } });
			}
		} catch (error) {
			console.error("로그인 에러:", error);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<SafeAreaView className="flex-1 bg-white dark:bg-neutral-950">
			<View className="flex-1 justify-center px-8">
				<View className="items-center mb-10 gap-3">
					<Image
						source={require("@/assets/icon.png")}
						style={{ width: 64, height: 64 }}
						resizeMode="contain"
					/>
					<Text className="text-2xl font-bold text-foreground dark:text-white">
						웹 메모
					</Text>
					<Text className="text-sm text-gray-500 dark:text-neutral-400 text-center">
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
