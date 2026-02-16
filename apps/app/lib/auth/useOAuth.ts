import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { supabase } from "@/lib/supabase/client";

WebBrowser.maybeCompleteAuthSession();

const redirectUri = AuthSession.makeRedirectUri({ scheme: "webmemo" });

type OAuthProvider = "google" | "kakao";

async function signInWithProvider(provider: OAuthProvider) {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: redirectUri,
      skipBrowserRedirect: true,
    },
  });

  if (error || !data.url) {
    throw error ?? new Error("Failed to get OAuth URL");
  }

  const result = await WebBrowser.openAuthSessionAsync(
    data.url,
    redirectUri
  );

  if (result.type !== "success" || !result.url) {
    return;
  }

  const url = new URL(result.url);
  const params = new URLSearchParams(
    url.hash ? url.hash.substring(1) : url.search.substring(1)
  );

  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");

  if (accessToken && refreshToken) {
    await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
  }
}

export function useOAuth() {
  const signInWithGoogle = () => signInWithProvider("google");
  const signInWithKakao = () => signInWithProvider("kakao");

  return { signInWithGoogle, signInWithKakao };
}
