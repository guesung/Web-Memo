import { I18n } from "@web-memo/shared/utils/extension";

/** 오프라인·동기화 중에 막히는 컨트롤의 종류. 오프라인일 때 보여줄 사유 문구가 저마다 다르다 */
export type TOfflineControlKind = "change" | "delete";

const OFFLINE_REASON_KEY: Record<TOfflineControlKind, string> = {
	change: "control_disabled_offline_change",
	delete: "control_disabled_offline_delete",
};

/**
 * 오프라인·동기화 중에 컨트롤을 막을 사유 문구를 고른다.
 * @description 동기화 중(온라인)에는 종류와 무관하게 공통 문구를 쓰고, 오프라인이면 종류별
 * 문구를 쓴다. 막을 이유가 없으면 `undefined`를 돌려주며, 호출부는 이 값의 존재로 disabled 여부를 정한다.
 */
export const getOfflineControlDisabledReason = ({
	isOffline,
	isSyncing,
	kind,
}: {
	isOffline: boolean;
	isSyncing: boolean;
	kind: TOfflineControlKind;
}): string | undefined => {
	if (isSyncing) {
		return I18n.get("control_disabled_syncing");
	}

	if (isOffline) {
		return I18n.get(OFFLINE_REASON_KEY[kind]);
	}

	return undefined;
};
