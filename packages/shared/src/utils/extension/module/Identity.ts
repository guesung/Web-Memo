/** 사용자가 로그인 창을 직접 닫았을 때 크롬이 돌려주는 오류 문구의 일부입니다. */
const USER_CLOSED_MESSAGE = "did not approve";

export class Identity {
	/**
	 * 확장 로그인 창을 쓸 수 있는지 봅니다.
	 * @description Firefox는 돌아올 주소의 도메인이 달라(`extensions.allizom.org`) 웹 콜백이
	 * 돌려보내는 주소를 알아듣지 못합니다. 권한이 없는 옛 빌드도 여기서 걸러집니다.
	 */
	static canLaunchWebAuthFlow() {
		return (
			typeof chrome.identity?.launchWebAuthFlow === "function" &&
			!chrome.runtime.getURL("").startsWith("moz-extension://")
		);
	}

	/**
	 * 로그인 창을 띄우고, 창이 확장 주소로 돌아오면 그 주소를 돌려줍니다.
	 * @returns 돌아온 주소. 사용자가 창을 닫았으면 `null`
	 * @throws 창을 띄우지 못했거나 페이지를 불러오지 못한 경우
	 */
	static async launchWebAuthFlow(url: string): Promise<string | null> {
		try {
			const returnedUrl = await chrome.identity.launchWebAuthFlow({
				url,
				interactive: true,
			});

			return returnedUrl ?? null;
		} catch (error) {
			if (error instanceof Error && error.message.includes(USER_CLOSED_MESSAGE))
				return null;

			throw error;
		}
	}
}
