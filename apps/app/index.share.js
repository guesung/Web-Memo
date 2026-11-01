// iOS 공유 확장(별도 앱 타깃)의 진입점. expo-share-extension은 이 파일이
// "shareExtension"이라는 이름으로 루트 컴포넌트를 등록할 것을 요구한다.
import { AppRegistry } from "react-native";
import ShareExtension from "@/components/shareExtension/ShareExtension";
// 별도 번들이라 본 앱의 스타일시트 등록을 공유하지 않는다. 여기서도 직접 읽어야 className이 적용된다.
import "./global.css";

AppRegistry.registerComponent("shareExtension", () => ShareExtension);
