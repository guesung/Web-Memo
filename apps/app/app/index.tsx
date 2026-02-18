import { Redirect } from "expo-router";

export default function Index() {
  // 로그인 여부와 무관하게 메인 화면으로 이동
  return <Redirect href="/(main)" />;
}
