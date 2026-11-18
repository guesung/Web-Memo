/**
 * 외부 API 호출 공통.
 *
 * 이 디렉토리의 스크립트는 전부 남의 API를 치고 그 결과로 알림을 보냅니다.
 * 실패했을 때 무엇이 왜 거절됐는지가 로그에 남지 않으면 원인을 찾을 길이 없습니다.
 */

/**
 * 에러 메시지에 싣는 응답 본문의 최대 길이.
 * 300자였을 때 Chrome 웹스토어의 게시 거부 응답이 사유(`details`) 직전에서 잘려 원인을 로그로 알 수 없었습니다.
 */
const MAX_ERROR_BODY_LENGTH = 1_000;

/** 응답이 2xx가 아니면 본문까지 담아 던집니다. 빈 에러 메시지는 디버깅이 불가능합니다. */
export const requestJson = async (url, options = {}) => {
	const response = await fetch(url, options);

	if (!response.ok) {
		const body = await response.text();
		throw new Error(`${response.status} ${url} — ${body.slice(0, MAX_ERROR_BODY_LENGTH)}`);
	}

	return await response.json();
};
