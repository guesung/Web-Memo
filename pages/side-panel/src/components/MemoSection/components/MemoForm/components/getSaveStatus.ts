import type { TSaveStatus } from "./SaveStatus";

/** getSaveStatus 입력 */
interface IFGetSaveStatusParams {
	isSaving: boolean;
	isOffline: boolean;
	/** 지금 편집 중인 메모가 오프라인 대기열에 있는지 */
	hasPendingOfflineItem: boolean;
	/** 마지막 flush 시도가 네트워크 오류로 중단됐는지 */
	hasSyncNetworkError: boolean;
	isSyncFailed: boolean;
	hasMemoText: boolean;
}

/**
 * 저장 표시줄 상태를 계산한다.
 * @description 기준은 "지금 편집 중인 메모가 오프라인 대기열에 있는가"다. 대기 항목이 있으면
 * 온라인이라도 flush가 끝나기 전까지 저장됨을 보여주지 않는다 — 대기열은 온라인·오프라인과
 * 무관하게 그 메모의 최신 내용이 아직 서버에 없다는 뜻이기 때문이다.
 * 사용처: MemoForm/index.tsx
 */
export const getSaveStatus = ({
	isSaving,
	isOffline,
	hasPendingOfflineItem,
	hasSyncNetworkError,
	isSyncFailed,
	hasMemoText,
}: IFGetSaveStatusParams): TSaveStatus => {
	if (isSaving) {
		return "saving";
	}

	if (hasPendingOfflineItem) {
		if (isOffline || hasSyncNetworkError) {
			return "offlineSaved";
		}

		if (isSyncFailed) {
			return "syncFailed";
		}

		return "syncing";
	}

	if (isOffline) {
		return "offline";
	}

	if (hasMemoText) {
		return "saved";
	}

	return null;
};
