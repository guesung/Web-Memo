import { CONFIG } from "@/lib/config";
import { supabase } from "@/lib/supabase/client";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { login as kakaoLogin } from "@react-native-seoul/kakao-login";
import * as AppleAuthentication from "expo-apple-authentication";
import { Platform } from "react-native";

GoogleSignin.configure({
	webClientId: CONFIG.googleWebClientId,
	iosClientId: CONFIG.googleAppClientId,
});

async function signInWithGoogle() {
	await GoogleSignin.hasPlayServices();
	const response = await GoogleSignin.signIn();

	if (!response.data?.idToken) {
		throw new Error("Google Sign-In failed: no idToken");
	}

	const { error } = await supabase.auth.signInWithIdToken({
		provider: "google",
		token: response.data.idToken,
	});

	if (error) throw error;
}

async function signInWithKakao() {
	const result = await kakaoLogin();

	const { data, error: fnError } = await supabase.functions.invoke(
		"kakao-auth",
		{ body: { kakao_access_token: result.accessToken } },
	);

	if (fnError || !data) {
		throw fnError ?? new Error("Failed to authenticate with Kakao");
	}

	const { error } = await supabase.auth.verifyOtp({
		token_hash: data.token,
		type: "magiclink",
	});

	if (error) throw error;
}

const isAppleAvailable = Platform.OS === "ios";

async function signInWithApple() {
	const credential = await AppleAuthentication.signInAsync({
		requestedScopes: [
			AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
			AppleAuthentication.AppleAuthenticationScope.EMAIL,
		],
	});

	if (!credential.identityToken) {
		throw new Error("Apple Sign-In failed: no identityToken");
	}

	const { error } = await supabase.auth.signInWithIdToken({
		provider: "apple",
		token: credential.identityToken,
	});

	if (error) throw error;
}

export function useOAuth() {
	return {
		signInWithGoogle,
		signInWithKakao,
		signInWithApple,
		isAppleAvailable,
	};
}
