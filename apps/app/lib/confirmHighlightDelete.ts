import { Alert } from "react-native";

/** 하이라이트 삭제 확인 Alert. 모아보기와 편집 시트가 같은 문구를 쓴다 */
export function confirmHighlightDelete(onConfirm: () => void) {
	Alert.alert(
		"하이라이트를 삭제할까요?",
		"하이라이트와 코멘트가 지워져요. 이 하이라이트로 쓴 메모는 남아요.",
		[
			{ text: "취소", style: "cancel" },
			{ text: "삭제", style: "destructive", onPress: onConfirm },
		],
	);
}
