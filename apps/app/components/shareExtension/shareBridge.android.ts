import { BackHandler, Linking } from "react-native";
import type { IFShareExtensionProps } from "./shareBridge.types";

/** ShareActivity가 넘긴 EXTRA_TEXT(URL 또는 URL이 섞인 일반 텍스트)에서 URL만 뽑는다. */
const SHARED_URL_PATTERN = /https?:\/\/\S+/;

/** props.text에서 URL을 뽑는다. URL을 찾지 못하면 빈 문자열을 반환한다. */
export function getSharedUrl(props: IFShareExtensionProps): string {
	return props.text?.match(SHARED_URL_PATTERN)?.[0] ?? "";
}

/**
 * 공유 화면(ShareActivity)만 끝낸다.
 * @description ShareActivity는 own invokeDefaultOnBackPressed를 오버라이드하지 않은
 * 일반 ReactActivity라 BackHandler.exitApp()이 호출하는 기본 뒤로가기 동작은 이 액티비티만
 * finish()한다. 같은 프로세스로 떠 있는 본 앱(MainActivity)은 종료되지 않는다.
 */
export function closeShareScreen(): void {
	BackHandler.exitApp();
}

/** 본 앱을 webmemo:// 딥링크로 열고 공유 화면을 닫는다. */
export function openHostAppWithPath(path: string): void {
	Linking.openURL(`webmemo://${path}`);
	closeShareScreen();
}
