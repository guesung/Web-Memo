import { GOOGLE_WEB_CLIENT_ID } from "@/lib/config";
import { supabase } from "@/lib/supabase/client";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { makeRedirectUri } from "expo-auth-session";
import * as QueryParams from "expo-auth-session/build/QueryParams";
import * as WebBrowser from "expo-web-browser";

WebBrowser.maybeCompleteAuthSession();

GoogleSignin.configure({
  webClientId: GOOGLE_WEB_CLIENT_ID,
  iosClientId:
    "541718063018-h672i93efg8mmnknsril75ajc1dlu1to.apps.googleusercontent.com",
});

const redirectTo = makeRedirectUri({
  scheme: "webmemo",
  path: "/",
});

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
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "kakao",
    options: { redirectTo, skipBrowserRedirect: true },
  });

  if (error || !data.url) {
    throw error ?? new Error("Failed to get OAuth URL");
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

  if (result.type === "success" && result.url) {
    await createSessionFromUrl(result.url);
  }
}

export function useOAuth() {
  return {
    signInWithGoogle,
    signInWithKakao,
    redirectTo,
  };
}
