import type { TSaveStatus } from "../hooks/useMemoForm";

/** getSaveStatus 입력 */
interface IFGetSaveStatusParams {
	/** useMemoForm이 관리하는 온라인 저장 상태(empty·saved·slow·failed·retrying) */
	saveStatus: TSaveStatus;
	isOffline: boolean;
	/** 지금 편집 중인 메모가 오프라인 대기열에 있는지 */
	hasPendingOfflineItem: boolean;
	/** 마지막 flush 시도가 네트워크 오류로 중단됐는지 */
	hasSyncNetworkError: boolean;
	isSyncFailed: boolean;
}

/**
 * 저장 표시줄에 실제로 그릴 상태를 계산한다.
 * @description 기준은 "지금 편집 중인 메모가 오프라인 대기열에 있는가"다. 대기 항목이 있으면
 * 온라인이라도 flush가 끝나기 전까지 saveStatus(saved 등)를 그대로 보여주지 않는다 — 대기열은
 * 온라인·오프라인과 무관하게 그 메모의 최신 내용이 아직 서버에 없다는 뜻이기 때문이다.
 * 대기 항목이 없으면 useMemoForm의 온라인 저장 상태 머신을 그대로 쓴다.
 * 사용처: MemoForm/index.tsx
 */
export const getSaveStatus = ({
	saveStatus,
	isOffline,
	hasPendingOfflineItem,
	hasSyncNetworkError,
	isSyncFailed,
}: IFGetSaveStatusParams): TSaveStatus => {
	if (hasPendingOfflineItem) {
		if (isOffline || hasSyncNetworkError) {
			return "offline";
		}

		if (isSyncFailed) {
			return "syncFailed";
		}

		return "syncing";
	}

	if (isOffline) {
		return "offlineIdle";
	}

	return saveStatus;
};
