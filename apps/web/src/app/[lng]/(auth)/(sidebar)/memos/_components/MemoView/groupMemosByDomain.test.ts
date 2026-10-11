import { describe, expect, it } from "vitest";
import {
	getMemoDomain,
	groupMemosByDomain,
	UNKNOWN_DOMAIN,
} from "./groupMemosByDomain";

describe("메모 도메인 그룹", () => {
	it("HTTP/HTTPS 호스트만 소문자로 정규화하고 첫 www.만 제거한다", () => {
		expect(getMemoDomain("https://WWW.Example.COM/path")).toBe("example.com");
		expect(getMemoDomain("http://sub.example.com/post")).toBe(
			"sub.example.com",
		);
		expect(getMemoDomain("https://www.www.example.com")).toBe(
			"www.example.com",
		);
		expect(getMemoDomain("https://unknown")).toBe("unknown");
	});

	it("비웹 URL과 잘못된 URL은 도메인 없음으로 모은다", () => {
		for (const url of ["file:///memo", "chrome://settings", "not-a-url", ""]) {
			expect(getMemoDomain(url)).toBe(UNKNOWN_DOMAIN);
		}
	});

	it("페이지 경계를 넘어 같은 도메인을 첫 등장 그룹에 조회 순서대로 합친다", () => {
		const firstPage = [
			{ id: 1, url: "https://www.example.com/a" },
			{ id: 2, url: "https://other.com/b" },
		];
		const secondPage = [
			{ id: 3, url: "http://EXAMPLE.com/c" },
			{ id: 4, url: "file:///memo" },
		];
		const groups = groupMemosByDomain([...firstPage, ...secondPage]);

		expect(groups.map(({ key }) => key)).toEqual([
			"example.com",
			"other.com",
			UNKNOWN_DOMAIN,
		]);
		expect(groups[0].memos.map(({ id }) => id)).toEqual([1, 3]);
	});
});
