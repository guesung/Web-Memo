import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { supabase } from "@/lib/supabase/client";

WebBrowser.maybeCompleteAuthSession();

const redirectUri = AuthSession.makeRedirectUri({ scheme: "webmemo" });

// 디버깅: Supabase에 등록해야 할 Redirect URL 출력
console.log("📱 OAuth Redirect URI:", redirectUri);
console.log("⚠️  이 URL을 Supabase Dashboard > Authentication > URL Configuration > Redirect URLs에 추가하세요");

type OAuthProvider = "google" | "kakao";

async function signInWithProvider(provider: OAuthProvider) {
  console.log(`🔐 Starting ${provider} OAuth flow with redirectUri:`, redirectUri);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: redirectUri,
      skipBrowserRedirect: true,
    },
  });

  if (error || !data.url) {
    console.error("❌ Supabase OAuth error:", error);
    throw error ?? new Error("Failed to get OAuth URL");
  }

  console.log("🌐 Opening OAuth URL:", data.url);

  const result = await WebBrowser.openAuthSessionAsync(
    data.url,
    redirectUri
  );

  console.log("📥 OAuth result:", result);

  if (result.type !== "success" || !result.url) {
    console.warn("⚠️  OAuth flow not completed:", result);
    return;
  }

  console.log("✅ OAuth success, result URL:", result.url);

  const url = new URL(result.url);
  const params = new URLSearchParams(
    url.hash ? url.hash.substring(1) : url.search.substring(1)
  );

  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");

  console.log("🔑 Tokens extracted:", {
    hasAccessToken: !!accessToken,
    hasRefreshToken: !!refreshToken,
  });

  if (accessToken && refreshToken) {
    await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    console.log("✅ Session set successfully");
  } else {
    console.error("❌ Missing tokens in OAuth response");
  }
}

export function useOAuth() {
  const signInWithGoogle = () => signInWithProvider("google");
  const signInWithKakao = () => signInWithProvider("kakao");

  return { signInWithGoogle, signInWithKakao };
}
