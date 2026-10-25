import { afterEach, describe, expect, it, vi } from "vitest";

import { buildBumpCommitMessage, fetchRefOptions } from "./github";

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

describe("fetchRefOptions", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.unstubAllEnvs();
	});

	const stubFetch = (response: { ok: boolean; body?: unknown }) => {
		vi.stubEnv("GITHUB_DISPATCH_TOKEN", "t0ken");
		const fetchMock = vi.fn().mockResolvedValue({
			ok: response.ok,
			json: async () => response.body ?? [],
		});
		vi.stubGlobal("fetch", fetchMock);

		return fetchMock;
	};

	it("태그는 조회하지 않고 master 커밋만 선택지로 만든다", async () => {
		const fetchMock = stubFetch({
			ok: true,
			body: [
				{
					sha: "8ae32c1aaaaaaaa",
					commit: { message: "feat: 정렬 추가\n\n본문" },
				},
				{ sha: "b931ac6bbbbbbbb", commit: { message: "fix: 예시" } },
			],
		});

		const options = await fetchRefOptions();

		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(fetchMock.mock.calls[0][0]).toContain("/commits?sha=master");
		expect(fetchMock.mock.calls[0][0]).not.toContain("/tags");
		expect(options).toEqual([
			{ label: "8ae32c1 feat: 정렬 추가", value: "8ae32c1aaaaaaaa" },
			{ label: "b931ac6 fix: 예시", value: "b931ac6bbbbbbbb" },
		]);
		expect(options.some(({ label }) => label.includes("🏷️"))).toBe(false);
	});

	it("라벨은 Slack 제한(75자)에 맞춰 자른다", async () => {
		stubFetch({
			ok: true,
			body: [{ sha: "8ae32c1aaaaaaaa", commit: { message: "가".repeat(200) } }],
		});

		const [option] = await fetchRefOptions();

		expect(option.label).toHaveLength(75);
	});

	it("조회가 실패하면 빈 목록이다", async () => {
		stubFetch({ ok: false });

		await expect(fetchRefOptions()).resolves.toEqual([]);
	});
});
