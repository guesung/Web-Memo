/**
 * 본 앱과 iOS 공유 확장이 공유하는 App Group 식별자.
 * @description expo-share-extension의 기본 App Group(`group.<bundleIdentifier>`)과
 * 같은 값이다. 로그인 세션(SecureStore 키체인)과 공유 확장이 보관한 공유 요청을
 * 이 그룹으로 양쪽에서 함께 읽고 쓴다. Android에는 App Group 개념이 없어 쓰이지 않는다.
 */
export const IOS_APP_GROUP = "group.com.webmemo.app";
