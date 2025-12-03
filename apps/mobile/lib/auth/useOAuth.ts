import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";

import { supabase } from "@/lib/supabase/client";

WebBrowser.maybeCompleteAuthSession();

type OAuthProvider = "google" | "apple" | "kakao";

const redirectUri = AuthSession.makeRedirectUri({
	scheme: "memozy",
});

export function useOAuth() {
	const [isLoading, setIsLoading] = useState(false);

	async function signInWithProvider(provider: OAuthProvider) {
		setIsLoading(true);
		try {
			const { data, error } = await supabase.auth.signInWithOAuth({
				provider,
				options: {
					redirectTo: redirectUri,
					skipBrowserRedirect: true,
				},
			});

			if (error) throw error;
			if (!data.url) throw new Error("No OAuth URL returned");

			const result = await WebBrowser.openAuthSessionAsync(
				data.url,
				redirectUri
			);

			if (result.type === "success") {
				const url = new URL(result.url);
				const params = new URLSearchParams(url.hash.substring(1));
				const accessToken = params.get("access_token");
				const refreshToken = params.get("refresh_token");

				if (accessToken && refreshToken) {
					await supabase.auth.setSession({
						access_token: accessToken,
						refresh_token: refreshToken,
					});
				}
			}
		} catch (error) {
			console.error(`${provider} sign in error:`, error);
		} finally {
			setIsLoading(false);
		}
	}

	return {
		signInWithGoogle: () => signInWithProvider("google"),
		signInWithApple: () => signInWithProvider("apple"),
		signInWithKakao: () => signInWithProvider("kakao"),
		isLoading,
	};
}
