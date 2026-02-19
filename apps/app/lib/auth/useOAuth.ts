import { supabase } from "@/lib/supabase/client";
import { makeRedirectUri } from "expo-auth-session";
import * as QueryParams from "expo-auth-session/build/QueryParams";
import * as WebBrowser from "expo-web-browser";


WebBrowser.maybeCompleteAuthSession();

const redirectTo = makeRedirectUri({
  scheme: "webmemo",
  path: "/",
});

console.log("📱 OAuth Redirect URI:", redirectTo);

type OAuthProvider = "google" | "kakao";

export async function createSessionFromUrl(url: string) {
  const { params, errorCode } = QueryParams.getQueryParams(url);
  if (errorCode) throw new Error(errorCode);

  const { access_token, refresh_token } = params;
  if (!access_token) return null;

  const { data, error } = await supabase.auth.setSession({
    access_token,
    refresh_token,
  });
  if (error) throw error;
  return data.session;
}

async function signInWithProvider(provider: OAuthProvider) {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error || !data.url) {
    throw error ?? new Error("Failed to get OAuth URL");
  }

  // 앱 내 Safari 시트로 OAuth 진행 (앱을 벗어나지 않음)
  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

  if (result.type === "success" && result.url) {
    await createSessionFromUrl(result.url);
  }
}

export function useOAuth() {
  return {
    signInWithGoogle: () => signInWithProvider("google"),
    signInWithKakao: () => signInWithProvider("kakao"),
    redirectTo,
  };
}
