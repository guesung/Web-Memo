/**
 * 배포된 크롬 확장 프로그램 ID.
 * @description
 * 웹 API 라우트의 CORS origin 검증(`chrome-extension://<id>`)과
 * `chrome.runtime.sendMessage`의 수신 대상 지정에 쓴다.
 * 크롬 웹스토어 등록 URL에도 이 값이 들어가므로 EXTERNAL_LINK가 이 상수를 참조한다.
 */
export const CHROME_EXTENSION_ID = "eaiojpmgklfngpjddhoalgcpkepgkclh";
