/**
 * 액션 아이콘을 누르면 사이드 패널이 열리도록 설정합니다.
 * sidePanel API가 없는 환경(UA를 위장한 Chromium 포크 등)이나 호출 실패가
 * onInstalled의 나머지 초기화(언어 설정·설치 가이드 탭)를 막으면 안 되므로 삼킵니다.
 */
export const configurePanelBehavior = async (): Promise<void> => {
	try {
		await chrome.sidePanel?.setPanelBehavior({ openPanelOnActionClick: true });
	} catch (error) {
		console.warn("[sidePanel] 패널 동작을 설정하지 못했습니다.", error);
	}
};
