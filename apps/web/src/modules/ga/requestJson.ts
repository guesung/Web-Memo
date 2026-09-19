/**
 * 구글 API 호출 공통.
 *
 * @description `.github/scripts/lib/http.mjs`와 같은 역할을 웹 앱 안에서 합니다.
 * 실패했을 때 무엇이 왜 거절됐는지가 남지 않으면 원인을 찾을 길이 없어, 응답 본문을
 * 에러 메시지에 담습니다.
 */

/** 응답이 2xx가 아니면 본문까지 담아 던집니다. 빈 에러 메시지는 디버깅이 불가능합니다. */
export const requestJson = async <TResponse>(
	url: string,
	options: RequestInit,
): Promise<TResponse> => {
	const response = await fetch(url, options);

	if (!response.ok) {
		const body = await response.text();

		throw new Error(`${response.status} ${url} — ${body.slice(0, 300)}`);
	}

	return (await response.json()) as TResponse;
};
