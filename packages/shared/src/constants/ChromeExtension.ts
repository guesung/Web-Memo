/**
 * 배포된 크롬 확장 프로그램 ID.
 * @description
 * 웹 API 라우트의 CORS origin 검증(`chrome-extension://<id>`)과
 * `chrome.runtime.sendMessage`의 수신 대상 지정에 쓴다.
 * 크롬 웹스토어 등록 URL에도 이 값이 들어가므로 EXTERNAL_LINK가 이 상수를 참조한다.
 */
export const CHROME_EXTENSION_ID = "eaiojpmgklfngpjddhoalgcpkepgkclh";

/**
 * 크롬 웹스토어 개발자 대시보드의 게시자(Publisher) ID.
 * @description
 * 웹스토어 API v2의 모든 요청 경로(`publishers/<id>/items/<extensionId>`)에 들어간다.
 * 비밀이 아닌 식별자이며, 확장 업로드와 스토어 버전 조회 스크립트(`.github/scripts`)가 이 파일에서 직접 읽는다.
 */
export const CHROME_WEB_STORE_PUBLISHER_ID =
	"67ad7c12-8c84-48c2-a2b7-eaf7129f4122";

/**
 * 확장 페이지의 절대 URL을 만든다.
 * @description 예: `getExtensionUrl("options/index.html")` →
 * `chrome-extension://<id>/options/index.html`
 */
export const getExtensionUrl = (path: string) =>
	`chrome-extension://${CHROME_EXTENSION_ID}/${path}`;
