import { isWebUrlDestination } from "./web-url.js";

const WEB_URL = "https://www.webmemo.test";

describe("isWebUrlDestination", () => {
	it.each([
		"https://www.webmemo.test/ko/memos?id=1",
		"https://webmemo.test/ko/memos",
	])("웹 도메인 주소 %s 는 허용한다", (destination) => {
		expect(isWebUrlDestination(destination, WEB_URL)).toBe(true);
	});

	it.each([
		["다른 도메인", "https://evil.test/ko/memos"],
		["userinfo로 속인 주소", "https://www.webmemo.test@evil.test/"],
		["하위 도메인", "https://evil.www.webmemo.test/"],
		["다른 프로토콜", "http://www.webmemo.test/"],
		["다른 포트", "https://www.webmemo.test:8443/"],
		["스크립트 주소", "javascript:alert(1)"],
		["주소가 아닌 값", "not a url"],
	])("%s 는 막는다", (_, destination) => {
		expect(isWebUrlDestination(destination, WEB_URL)).toBe(false);
	});
});
