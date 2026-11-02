/**
 * 수신 화면이 닫혀 있으면 다음 열기에서 다시 조회하므로, 알림 실패는 할 행동이 없어 삼킨다.
 * 동기 throw도 함께 삼키기 위해 send를 async 경계 안에서 호출한다.
 */
export async function notifyQuietly(
	send: () => Promise<unknown>,
): Promise<void> {
	try {
		await send();
	} catch {
		// 보고하지 않는다.
	}
}
