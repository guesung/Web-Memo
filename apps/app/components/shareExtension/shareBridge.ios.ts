import type { InitialProps } from "expo-share-extension";
import { close, openHostApp } from "expo-share-extension";

/**
 * InitialProps에서 공유된 URL을 뽑는다.
 * @description url이 비어 있으면 text를 URL로 취급한다(공유 소스가 url을 안 채우는 경우 대비).
 */
export function getSharedUrl(props: InitialProps): string {
	return props.url ?? props.text ?? "";
}

/** 공유 확장 화면을 닫는다. */
export function closeShareScreen(): void {
	close();
}

/** 본 앱을 webmemo:// 딥링크로 열고 공유 확장 화면을 닫는다. */
export function openHostAppWithPath(path: string): void {
	openHostApp(path);
}
