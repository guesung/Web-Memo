import { describe, expect, it } from "vitest";

import {
	compareSemver,
	isVersionAhead,
	parseSemver,
	replaceVersionInJson,
} from "./version";

describe("parseSemver", () => {
	it("세 자리 버전을 숫자로 파싱한다", () => {
		expect(parseSemver("1.10.16")).toEqual([1, 10, 16]);
	});

	it("앞뒤 공백은 무시한다", () => {
		expect(parseSemver("  1.0.8 ")).toEqual([1, 0, 8]);
	});

	it.each(["1.2", "1.2.3.4", "v1.2.3", "1.2.3-beta", "1.2.x", ""])(
		"세 자리 숫자가 아닌 %s는 거부한다",
		(value) => {
			expect(parseSemver(value)).toBeNull();
		},
	);
});

describe("compareSemver", () => {
	it("patch 자리를 문자열이 아니라 숫자로 비교한다", () => {
		// "1.10.9" > "1.10.10"이 되는 문자열 비교 함정을 막습니다.
		expect(compareSemver([1, 10, 10], [1, 10, 9])).toBeGreaterThan(0);
	});

	it("minor 자리가 patch 자리보다 우선한다", () => {
		expect(compareSemver([1, 2, 0], [1, 1, 99])).toBeGreaterThan(0);
	});

	it("같은 버전은 0이다", () => {
		expect(compareSemver([1, 0, 8], [1, 0, 8])).toBe(0);
	});
});

describe("isVersionAhead", () => {
	it("현재보다 높으면 통과시킨다", () => {
		expect(
			isVersionAhead({ nextVersion: [1, 10, 17], currentVersion: "1.10.16" }),
		).toBe(true);
	});

	it("현재와 같으면 막는다", () => {
		expect(
			isVersionAhead({ nextVersion: [1, 10, 16], currentVersion: "1.10.16" }),
		).toBe(false);
	});

	it("현재보다 낮으면 막는다", () => {
		expect(
			isVersionAhead({ nextVersion: [1, 9, 99], currentVersion: "1.10.0" }),
		).toBe(false);
	});

	it("현재 버전을 못 읽었으면 비교를 건너뛴다", () => {
		// 조회 실패 때문에 정상적인 버전업까지 막히면 안 됩니다.
		expect(isVersionAhead({ nextVersion: [1, 0, 0] })).toBe(true);
		expect(
			isVersionAhead({ nextVersion: [1, 0, 0], currentVersion: "이상한값" }),
		).toBe(true);
	});
});

describe("replaceVersionInJson", () => {
	const packageJson = `{
	"name": "@web-memo/chrome-extension",
	"private": true,
	"version": "1.10.16",
	"description": "chrome extension"
}
`;

	it("버전 한 줄만 바꾸고 나머지 원문을 그대로 둔다", () => {
		const next = replaceVersionInJson({
			source: packageJson,
			currentVersion: "1.10.16",
			nextVersion: "1.10.17",
		});

		expect(next).toBe(packageJson.replace("1.10.16", "1.10.17"));
	});

	it("탭 들여쓰기와 끝 개행을 보존한다", () => {
		const next = replaceVersionInJson({
			source: packageJson,
			currentVersion: "1.10.16",
			nextVersion: "1.10.17",
		});

		expect(next).toContain('\t"version": "1.10.17",');
		expect(next.endsWith("}\n")).toBe(true);
	});

	it("expo 아래 version만 바꾸고 kotlinVersion 같은 키는 건드리지 않는다", () => {
		const appJson = `{
	"expo": {
		"version": "1.0.8",
		"android": { "kotlinVersion": "2.0.21" }
	}
}
`;

		expect(
			replaceVersionInJson({
				source: appJson,
				currentVersion: "1.0.8",
				nextVersion: "1.0.9",
			}),
		).toBe(appJson.replace('"1.0.8"', '"1.0.9"'));
	});

	it("바꿀 자리를 못 찾으면 던진다", () => {
		expect(() =>
			replaceVersionInJson({
				source: packageJson,
				currentVersion: "9.9.9",
				nextVersion: "9.9.10",
			}),
		).toThrow(/특정하지 못했습니다/);
	});

	it("같은 버전이 여러 곳에 있으면 던진다", () => {
		// 엉뚱한 자리를 고친 커밋이 master에 남는 것보다 실패가 낫습니다.
		const ambiguous = `{
	"version": "1.0.0",
	"nested": { "version": "1.0.0" }
}
`;

		expect(() =>
			replaceVersionInJson({
				source: ambiguous,
				currentVersion: "1.0.0",
				nextVersion: "1.0.1",
			}),
		).toThrow(/2곳/);
	});
});
