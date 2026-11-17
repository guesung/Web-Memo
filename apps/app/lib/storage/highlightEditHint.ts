import AsyncStorage from "@react-native-async-storage/async-storage";

const HIGHLIGHT_EDIT_HINT_SEEN_KEY = "webmemo:highlight-edit-hint-seen";

/**
 * 하이라이트 편집 안내를 이미 봤는지 반환한다.
 * 읽기에 실패하면 true로 봐서 안내를 띄우지 않는다(실패 때마다 반복 노출되는 것을 막는다)
 */
export async function getHighlightEditHintSeen(): Promise<boolean> {
	try {
		const value = await AsyncStorage.getItem(HIGHLIGHT_EDIT_HINT_SEEN_KEY);
		return value === "true";
	} catch {
		return true;
	}
}

/** 하이라이트 편집 안내를 봤다고 기기에 저장한다 */
export async function saveHighlightEditHintSeen(): Promise<void> {
	try {
		await AsyncStorage.setItem(HIGHLIGHT_EDIT_HINT_SEEN_KEY, "true");
	} catch {}
}
