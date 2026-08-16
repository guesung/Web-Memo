import AsyncStorage from "@react-native-async-storage/async-storage";

/** 느낀 점 입력란 노출 여부를 저장하는 AsyncStorage 키 */
const IMPRESSION_SECTION_ENABLED_KEY = "webmemo:impression-section-enabled";
/** 액션 아이템 입력란 노출 여부를 저장하는 AsyncStorage 키 */
const ACTION_ITEM_SECTION_ENABLED_KEY = "webmemo:action-item-section-enabled";

/**
 * 메모 작성 화면의 느낀 점·액션 아이템 입력란 노출 여부
 */
export interface IFMemoSectionSettings {
	/** 느낀 점 입력란 노출 여부 */
	isImpressionSectionEnabled: boolean;
	/** 액션 아이템 입력란 노출 여부 */
	isActionItemSectionEnabled: boolean;
}

/** 설정값이 없을 때 사용하는 기본값 (둘 다 표시) */
export const DEFAULT_MEMO_SECTION_SETTINGS: IFMemoSectionSettings = {
	isImpressionSectionEnabled: true,
	isActionItemSectionEnabled: true,
};

/**
 * 저장된 메모 섹션 노출 설정을 읽는다. 저장된 값이 없거나 읽기에 실패하면 기본값을 반환한다.
 */
export async function getMemoSectionSettings(): Promise<IFMemoSectionSettings> {
	try {
		const [impressionValue, actionItemValue] = await AsyncStorage.multiGet([
			IMPRESSION_SECTION_ENABLED_KEY,
			ACTION_ITEM_SECTION_ENABLED_KEY,
		]);

		return {
			isImpressionSectionEnabled: impressionValue[1] !== "false",
			isActionItemSectionEnabled: actionItemValue[1] !== "false",
		};
	} catch {
		return DEFAULT_MEMO_SECTION_SETTINGS;
	}
}

/**
 * 메모 섹션 노출 설정을 저장한다.
 */
export async function saveMemoSectionSettings(
	settings: IFMemoSectionSettings,
): Promise<void> {
	try {
		await AsyncStorage.multiSet([
			[
				IMPRESSION_SECTION_ENABLED_KEY,
				String(settings.isImpressionSectionEnabled),
			],
			[
				ACTION_ITEM_SECTION_ENABLED_KEY,
				String(settings.isActionItemSectionEnabled),
			],
		]);
	} catch {}
}
