import { describe, expect, it } from "vitest";
import {
	branchFor,
	buildPrBody,
	buildPrTitle,
	computeNextVersion,
	decideNextVersionPr,
	MERGE_WARNING,
} from "./sync-next-version-pr.mjs";

describe("computeNextVersion", () => {
	it("배포한 버전에서 patch만 올린다", () => {
		expect(computeNextVersion("1.11.5")).toBe("1.11.6");
		expect(computeNextVersion("1.11.9")).toBe("1.11.10");
	});
});

describe("branchFor / buildPrTitle", () => {
	it("트랙마다 고정 브랜치를 쓴다", () => {
		expect(branchFor("extension")).toBe("chore/next-version-extension");
		expect(branchFor("app")).toBe("chore/next-version-app");
	});

	it("제목은 트랙 이름과 다음 버전을 담는다", () => {
		expect(buildPrTitle({ track: "extension", nextVersion: "1.11.6" })).toBe(
			"chore: 확장 버전을 1.11.6로 올린다",
		);
		expect(buildPrTitle({ track: "app", nextVersion: "1.0.9" })).toBe(
			"chore: 앱 버전을 1.0.9로 올린다",
		);
	});
});

describe("buildPrBody", () => {
	const base = {
		track: "extension",
		deployedVersion: "1.11.5",
		nextVersion: "1.11.6",
		deployRef: "a".repeat(40),
	};

	it("머지 금지 안내와 배포 정보를 담는다", () => {
		const body = buildPrBody(base);

		expect(body).toContain(MERGE_WARNING);
		expect(body).toContain(
			"직접 머지하지 마세요. Slack에서 버전 올려 배포를 고르면 이 PR이 머지되고 배포됩니다.",
		);
		expect(body).toContain("배포된 버전: 1.11.5");
		expect(body).toContain(`배포 ref: \`${"a".repeat(40)}\``);
		expect(body).not.toContain("release 실행");
	});

	it("실행 링크가 있으면 넣는다", () => {
		expect(
			buildPrBody({ ...base, runUrl: "https://github.com/o/r/actions/runs/1" }),
		).toContain("release 실행: https://github.com/o/r/actions/runs/1");
	});
});

describe("decideNextVersionPr", () => {
	it("master가 뒤에 있고 열린 PR이 없으면 만든다", () => {
		expect(
			decideNextVersionPr({
				nextVersion: "1.11.6",
				masterVersion: "1.11.5",
				openPrNumber: null,
			}),
		).toEqual({ action: "create", reason: "behind" });
	});

	it("열린 PR이 있으면 갱신한다", () => {
		expect(
			decideNextVersionPr({
				nextVersion: "1.11.6",
				masterVersion: "1.11.5",
				openPrNumber: 7,
			}).action,
		).toBe("update");
	});

	it("master가 이미 다음 버전과 같으면 noop이다", () => {
		expect(
			decideNextVersionPr({
				nextVersion: "1.11.6",
				masterVersion: "1.11.6",
				openPrNumber: null,
			}),
		).toEqual({ action: "noop", reason: "master-ahead" });
	});

	it("master가 더 앞서면 열린 PR이 있어도 noop이고 사유로 남긴다", () => {
		expect(
			decideNextVersionPr({
				nextVersion: "1.11.6",
				masterVersion: "1.12.0",
				openPrNumber: 7,
			}),
		).toEqual({ action: "noop", reason: "master-ahead-open-pr" });
	});

	it("숫자로 비교한다 (1.11.10 > 1.11.9)", () => {
		expect(
			decideNextVersionPr({
				nextVersion: "1.11.9",
				masterVersion: "1.11.10",
				openPrNumber: null,
			}).action,
		).toBe("noop");
	});

	it("semver가 아니면 던진다", () => {
		expect(() =>
			decideNextVersionPr({
				nextVersion: "1.11.6",
				masterVersion: "x",
				openPrNumber: null,
			}),
		).toThrow();
	});
});
