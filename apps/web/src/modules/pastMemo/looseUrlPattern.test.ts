import { describe, expect, it } from "vitest";
import { buildLooseUrlPattern } from "./looseUrlPattern";

describe("buildLooseUrlPattern", () => {
	it("www.·m. 서브도메인과 끝 슬래시·쿼리를 뺀 호스트+경로의 포함 패턴을 만든다", () => {
		expect(
			buildLooseUrlPattern("https://www.blog.com/post/?utm_source=x#top"),
		).toBe("%blog.com/post%");
		expect(buildLooseUrlPattern("https://m.blog.com/post")).toBe(
			"%blog.com/post%",
		);
	});

	it("LIKE 특수문자를 이스케이프한다", () => {
		expect(buildLooseUrlPattern("https://blog.com/a_b%c")).toBe(
			"%blog.com/a\\_b\\%c%",
		);
	});

	it("YouTube와 youtu.be는 영상 ID만으로 좁힌다", () => {
		expect(buildLooseUrlPattern("https://www.youtube.com/watch?v=abc_1")).toBe(
			"%abc\\_1%",
		);
		expect(buildLooseUrlPattern("https://youtu.be/abc_1?si=x")).toBe(
			"%abc\\_1%",
		);
	});

	it("파싱할 수 없는 URL은 null이다", () => {
		expect(buildLooseUrlPattern("not a url")).toBeNull();
	});
});
