import { describe, expect, it } from "vitest";

import { buildBumpCommitMessage } from "./github";

describe("buildBumpCommitMessage", () => {
	const requestedBy = "guesung";

	it("확장만 올리면 확장만 제목에 적는다", () => {
		expect(
			buildBumpCommitMessage({ extensionVersion: "1.10.17", requestedBy }),
		).toBe(
			"chore: 확장 버전을 1.10.17로 올린다\n\nSlack 배포 모달에서 자동 생성 · guesung",
		);
	});

	it("앱만 올리면 앱만 제목에 적는다", () => {
		expect(
			buildBumpCommitMessage({ appVersion: "1.0.9", requestedBy }),
		).toContain("chore: 앱 버전을 1.0.9로 올린다");
	});

	it("둘 다 올리면 한 줄에 둘 다 적는다", () => {
		// 커밋은 하나이므로 제목도 하나여야 합니다.
		expect(
			buildBumpCommitMessage({
				appVersion: "1.0.9",
				extensionVersion: "1.10.17",
				requestedBy,
			}),
		).toContain("chore: 앱 1.0.9 · 확장 1.10.17로 버전을 올린다");
	});

	it("제목과 본문을 빈 줄로 나눈다", () => {
		// docs/commit-convention.md의 형식입니다.
		const [subject, blank, body] = buildBumpCommitMessage({
			extensionVersion: "1.10.17",
			requestedBy,
		}).split("\n");

		expect(subject.startsWith("chore: ")).toBe(true);
		expect(subject.length).toBeLessThanOrEqual(72);
		expect(blank).toBe("");
		expect(body).toContain(requestedBy);
	});
});
