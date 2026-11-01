import { describe, expect, it } from "vitest";
import {
	bumpVersion,
	compareSemver,
	parseSemver,
	replaceVersionInJson,
} from "./version.mjs";

describe("parseSemver", () => {
	it("세 자리 숫자를 파싱한다", () => {
		expect(parseSemver("1.11.5")).toEqual([1, 11, 5]);
		expect(parseSemver(" 2.0.0 ")).toEqual([2, 0, 0]);
	});

	it("형식이 아니면 null이다", () => {
		expect(parseSemver("1.2")).toBeNull();
		expect(parseSemver("v1.2.3")).toBeNull();
		expect(parseSemver("1.2.3-beta")).toBeNull();
	});
});

describe("compareSemver", () => {
	it("자리별로 숫자로 비교한다", () => {
		expect(compareSemver([1, 11, 10], [1, 11, 9])).toBeGreaterThan(0);
		expect(compareSemver([1, 2, 0], [1, 10, 0])).toBeLessThan(0);
		expect(compareSemver([1, 2, 3], [1, 2, 3])).toBe(0);
	});
});

describe("bumpVersion", () => {
	it("기본은 patch다", () => {
		expect(bumpVersion("1.11.5")).toBe("1.11.6");
		expect(bumpVersion("1.11.9")).toBe("1.11.10");
	});

	it("minor는 patch를 0으로 되돌린다", () => {
		expect(bumpVersion("1.11.5", "minor")).toBe("1.12.0");
	});

	it("major는 minor와 patch를 0으로 되돌린다", () => {
		expect(bumpVersion("1.11.5", "major")).toBe("2.0.0");
	});

	it("semver가 아니거나 모르는 단위면 던진다", () => {
		expect(() => bumpVersion("1.2")).toThrow();
		expect(() => bumpVersion("1.2.3", "huge")).toThrow();
	});
});

describe("replaceVersionInJson", () => {
	const source =
		'{\n\t"name": "x",\n\t"version": "1.11.5",\n\t"private": true\n}\n';

	it("버전 한 줄만 바꾸고 나머지 원문은 그대로 둔다", () => {
		expect(
			replaceVersionInJson({
				source,
				currentVersion: "1.11.5",
				nextVersion: "1.11.6",
			}),
		).toBe('{\n\t"name": "x",\n\t"version": "1.11.6",\n\t"private": true\n}\n');
	});

	it("자리를 못 찾으면 던진다", () => {
		expect(() =>
			replaceVersionInJson({
				source,
				currentVersion: "9.9.9",
				nextVersion: "9.9.10",
			}),
		).toThrow("0곳");
	});

	it("같은 값이 여러 곳이면 던진다", () => {
		const twice = '{"version":"1.0.0","expo":{"version":"1.0.0"}}';

		expect(() =>
			replaceVersionInJson({
				source: twice,
				currentVersion: "1.0.0",
				nextVersion: "1.0.1",
			}),
		).toThrow("2곳");
	});
});
