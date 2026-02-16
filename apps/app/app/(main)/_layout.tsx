import { Stack } from "expo-router";

export default function MainLayout() {
  // 로그인 체크 제거 - 누구나 접근 가능
  return <Stack screenOptions={{ headerShown: false }} />;
}
