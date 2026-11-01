import AsyncStorage from "@react-native-async-storage/async-storage";

const WEB_NOTICE_DISMISSED_KEY = "webmemo:web-notice-dismissed";

/** 웹 안내 배너를 닫았는지 저장된 값을 반환한다. 값이 없거나 읽기에 실패하면 false로 본다 */
export async function getWebNoticeDismissed(): Promise<boolean> {
	try {
		const value = await AsyncStorage.getItem(WEB_NOTICE_DISMISSED_KEY);
		return value === "true";
	} catch {
		return false;
	}
}

/** 웹 안내 배너를 닫았다는 사실을 기기에 저장한다 */
export async function saveWebNoticeDismissed(): Promise<void> {
	try {
		await AsyncStorage.setItem(WEB_NOTICE_DISMISSED_KEY, "true");
	} catch {}
}
