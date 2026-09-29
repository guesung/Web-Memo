// 본 앱의 진입점. expo-share-extension이 요구하는 index.js/index.share.js
// 분리 구조로 옮기면서, 기존 "main": "expo-router/entry"를 대체한다.
import "expo-router/entry";

// Android는 iOS와 달리 별도 확장 타깃/번들이 없다. ShareActivity(같은 프로세스)가
// "shareExtension" 컴포넌트를 그릴 수 있도록 본 앱 번들에도 등록해 둔다. iOS 공유
// 확장은 index.share.js라는 별도 번들을 쓰므로 이 등록과 겹치지 않는다.
import { AppRegistry } from "react-native";
import ShareExtension from "@/components/shareExtension/ShareExtension";

AppRegistry.registerComponent("shareExtension", () => ShareExtension);
