// iOS 공유 확장(별도 앱 타깃)의 진입점. expo-share-extension은 이 파일이
// "shareExtension"이라는 이름으로 루트 컴포넌트를 등록할 것을 요구한다.
import { AppRegistry } from "react-native";
import ShareExtension from "@/components/shareExtension/ShareExtension";

AppRegistry.registerComponent("shareExtension", () => ShareExtension);
