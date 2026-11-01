/**
 * 삭제 사유 선택지. 저장되는 값이자 번역 키(`uninstall.reasons.*`)의 일부입니다.
 * @description 값과 순서는 관리자 파서 `admin/feedback/_utils/parseUninstallFeedback.ts`의
 * `UNINSTALL_REASONS`와 같아야 합니다.
 */
export const UNINSTALL_REASON_VALUES = [
	"not_useful",
	"hard_to_use",
	"found_alternative",
	"privacy_concerns",
	"performance_issues",
	"other",
] as const;
