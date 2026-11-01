import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
	installFakeFetch,
	MASTER_SHA,
	MERGE_SHA,
	RESPONSE_URL,
} from "./nextVersionPr.testHelpers";

const bumpOverride = vi.hoisted(() => ({
	fn: undefined as undefined | ((version: string) => string),
}));

vi.mock("./version", async (importActual) => {
	const actual = await importActual<typeof import("./version")>();

	return {
		...actual,
		bumpVersion: (...args: Parameters<typeof actual.bumpVersion>) =>
			bumpOverride.fn ? bumpOverride.fn(args[0]) : actual.bumpVersion(...args),
	};
});

import {
	handleBumpDeploy,
	type IFBumpSelection,
	parseBumpSelection,
} from "./nextVersionPr";

const selection: IFBumpSelection = {
	target: "extension",
	ref: MASTER_SHA,
	bump: "patch",
	version: "1.11.6",
};

const run = (overrides: Partial<IFBumpSelection> = {}) =>
	handleBumpDeploy({
		selection: { ...selection, ...overrides },
		responseUrl: RESPONSE_URL,
		userId: "U1",
	});

describe("버전 올려 배포", () => {
	beforeEach(() => {
		vi.stubEnv("GITHUB_DISPATCH_TOKEN", "test-token");
	});

	afterEach(() => {
		bumpOverride.fn = undefined;
		vi.unstubAllGlobals();
		vi.unstubAllEnvs();
	});

	describe("게이트", () => {
		it("버튼 ref가 master 최신이 아니면 반려하고 쓰기 요청을 하지 않는다", async () => {
			const fake = installFakeFetch();

			await run({ ref: "b".repeat(40) });

			expect(fake.slackTexts().at(-1)?.text).toContain(
				"최신 master 빌드에서만 버전을 올릴 수 있습니다",
			);
			expect(fake.slackTexts().at(-1)?.response_type).toBe("ephemeral");
			expect(fake.writes()).toEqual([]);
		});

		it("master 버전이 바뀌어 표시한 버전과 다르면 반려하고 쓰기 요청을 하지 않는다", async () => {
			const fake = installFakeFetch({}, { extensionVersion: "1.11.6" });

			await run();

			expect(fake.slackTexts().at(-1)?.text).toContain(
				"표시된 버전(1.11.6)이 바뀌었습니다",
			);
			expect(fake.writes()).toEqual([]);
			expect(fake.dispatches()).toHaveLength(0);
		});

		it("결과 버전이 master 버전보다 크지 않으면 반려하고 쓰기 요청을 하지 않는다", async () => {
			// 계산이 어긋나 같은 버전을 돌려주는 경우에도 마지막 안전장치가 막는다.
			bumpOverride.fn = (version) => version;
			const fake = installFakeFetch({}, { extensionVersion: "1.11.6" });

			await run();

			expect(fake.slackTexts().at(-1)?.text).toContain(
				"선택한 버전(1.11.6)이 master 버전(1.11.6)보다 커야 합니다",
			);
			expect(fake.writes()).toEqual([]);
			expect(fake.dispatches()).toHaveLength(0);
		});

		it("master 최신 커밋을 확인하지 못하면 반려한다", async () => {
			const fake = installFakeFetch({
				"GET /git/ref/heads/master": { status: 500 },
			});

			await run();

			expect(fake.slackTexts().at(-1)?.text).toContain(
				"master의 최신 커밋을 확인하지 못했습니다",
			);
			expect(fake.writes()).toEqual([]);
		});
	});

	describe("정상 흐름", () => {
		it("준비 중 메시지를 먼저 보낸다", async () => {
			const fake = installFakeFetch();

			await run();

			expect(fake.slackTexts()[0].text).toBe("⏳ 🧩 확장 1.11.6 준비 중…");
		});

		it("열린 PR이 없으면 브랜치를 만든 뒤 PR을 만들어 진행한다", async () => {
			const fake = installFakeFetch();

			await run();

			const order = fake.writes().map((call) => `${call.method} ${call.path}`);

			expect(order).toEqual([
				"POST /git/blobs",
				"POST /git/trees",
				"POST /git/commits",
				"POST /git/refs",
				"POST /pulls",
				"PUT /pulls/9/merge",
				"POST /actions/workflows/release.yml/dispatches",
			]);
			expect(
				fake.calls.find(
					(call) => call.method === "POST" && call.path === "/git/refs",
				)?.body,
			).toEqual({
				ref: "refs/heads/chore/next-version-extension",
				sha: "new-commit",
			});
			expect(
				fake.calls.find(
					(call) => call.method === "POST" && call.path === "/pulls",
				)?.body,
			).toMatchObject({
				title: "chore: 확장 버전을 1.11.6로 올린다",
				head: "chore/next-version-extension",
				base: "master",
				body: expect.stringContaining(
					"직접 머지하지 마세요. Slack에서 버전 올려 배포를 고르면 이 PR이 머지되고 배포됩니다.",
				),
			});
		});

		it("열린 PR을 head=owner:branch, state=open으로 조회한다", async () => {
			const fake = installFakeFetch();

			await run();

			expect(fake.calls.map((call) => call.path)).toContain(
				"/pulls?head=guesung%3Achore%2Fnext-version-extension&state=open",
			);
		});

		it("열린 PR이 있으면 브랜치를 master HEAD 부모 커밋 1개로 force 갱신하고 제목을 고친다", async () => {
			const fake = installFakeFetch({}, { openPrNumber: 7 });

			await run();

			const commit = fake.calls.find(
				(call) => call.method === "POST" && call.path === "/git/commits",
			);
			const blob = fake.calls.find((call) => call.path === "/git/blobs");
			const ref = fake.calls.find(
				(call) =>
					call.method === "PATCH" &&
					call.path === "/git/refs/heads/chore/next-version-extension",
			);

			expect(commit?.body).toMatchObject({
				parents: [MASTER_SHA],
				tree: "tree",
				message: "chore: 확장 버전을 1.11.6로 올린다",
			});
			// 버전 한 줄만 바뀐 파일이어야 한다
			expect((blob?.body as { content: string }).content).toContain(
				'"version": "1.11.6"',
			);
			expect(ref?.body).toEqual({ sha: "new-commit", force: true });
			expect(
				fake.calls.find(
					(call) => call.path === "/pulls/7" && call.method === "PATCH",
				)?.body,
			).toEqual({
				title: "chore: 확장 버전을 1.11.6로 올린다",
			});
			expect(
				fake.calls.some(
					(call) => call.method === "POST" && call.path === "/pulls",
				),
			).toBe(false);
		});

		it("남아 있던 옛 브랜치(422)는 force 갱신으로 되돌려 PR을 만든다", async () => {
			const fake = installFakeFetch({
				"POST /git/refs": {
					status: 422,
					json: { message: "Reference already exists" },
				},
			});

			await run();

			expect(
				fake.calls.some(
					(call) =>
						call.method === "PATCH" &&
						call.path === "/git/refs/heads/chore/next-version-extension",
				),
			).toBe(true);
			expect(fake.dispatches()).toHaveLength(1);
		});

		it("merge_method는 merge이고 방금 올린 커밋만 머지한다", async () => {
			const fake = installFakeFetch();

			await run();

			expect(fake.calls.find((call) => call.method === "PUT")?.body).toEqual({
				merge_method: "merge",
				sha: "new-commit",
			});
		});

		it("머지 커밋 SHA로 그 트랙 하나만 dispatch하고 🚀 문구를 보낸다", async () => {
			const fake = installFakeFetch();

			await run();

			expect(fake.dispatches()).toHaveLength(1);
			expect(fake.dispatches()[0].body).toEqual({
				ref: "master",
				inputs: {
					app: "false",
					web: "false",
					extension: "true",
					ref: MERGE_SHA,
				},
			});
			const last = fake.slackTexts().at(-1);

			expect(last?.text).toContain("🚀 🧩 확장 1.11.6 배포를 시작했습니다");
			expect(last?.response_type).toBe("in_channel");
		});

		it("앱 트랙은 앱 파일로 커밋하고 앱만 dispatch한다", async () => {
			const fake = installFakeFetch({}, {});

			await run({ target: "app", version: "2.4.10" });

			expect(fake.dispatches()[0].body).toMatchObject({
				inputs: { app: "true", extension: "false", web: "false" },
			});
			expect(
				fake.calls.find((call) => call.path === "/git/blobs")?.body,
			).toMatchObject({
				content: expect.stringContaining('"version": "2.4.10"'),
			});
		});
	});

	describe("실패", () => {
		it("머지가 405로 거절되면 GitHub message를 전달하고 dispatch를 부르지 않는다", async () => {
			const fake = installFakeFetch({
				"PUT /pulls/9/merge": {
					status: 405,
					json: { message: "Pull Request is not mergeable" },
				},
			});

			await run();

			const last = fake.slackTexts().at(-1);

			expect(last?.text).toContain("Pull Request is not mergeable");
			expect(last?.response_type).toBe("ephemeral");
			expect(fake.dispatches()).toHaveLength(0);
		});

		it("머지 이전 단계가 실패해도 GitHub message를 전달하고 머지·dispatch를 하지 않는다", async () => {
			const fake = installFakeFetch({
				"POST /pulls": { status: 422, json: { message: "Validation Failed" } },
			});

			await run();

			expect(fake.slackTexts().at(-1)?.text).toContain(
				"PR 생성 실패: Validation Failed",
			);
			expect(fake.calls.some((call) => call.method === "PUT")).toBe(false);
			expect(fake.dispatches()).toHaveLength(0);
		});

		it("머지 뒤 dispatch만 실패하면 머지 완료 안내를 붙인다", async () => {
			const fake = installFakeFetch({
				"POST /actions/workflows/release.yml/dispatches": {
					status: 422,
					text: "Workflow does not have 'workflow_dispatch' trigger",
				} as never,
			});

			await run();

			const last = fake.slackTexts().at(-1);

			expect(last?.text).toContain("머지는 완료됨 · 배포 버튼으로 다시 시도");
			expect(last?.text).not.toContain("🚀");
		});
	});
});

describe("parseBumpSelection", () => {
	const value = JSON.stringify(selection);

	it("올바른 value와 action_id를 파싱한다", () => {
		expect(
			parseBumpSelection({ actionId: "deploy_bump_extension", value }),
		).toEqual(selection);
	});

	it("action_id의 트랙과 value의 target이 다르면 던진다", () => {
		expect(() =>
			parseBumpSelection({ actionId: "deploy_bump_app", value }),
		).toThrow();
	});

	it.each([
		undefined,
		"not json",
		JSON.stringify({ ...selection, bump: "huge" }),
		JSON.stringify({ ...selection, version: "v1" }),
		JSON.stringify({ ...selection, target: "web" }),
		JSON.stringify({ ...selection, ref: "" }),
	])("형식이 틀린 value(%s)는 던진다", (bad) => {
		expect(() =>
			parseBumpSelection({ actionId: "deploy_bump_extension", value: bad }),
		).toThrow("버전 선택 값");
	});
});
