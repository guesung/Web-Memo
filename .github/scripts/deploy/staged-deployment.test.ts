import { afterEach, describe, expect, it, vi } from "vitest";
import {
	fetchProductionDeployments,
	pickStagedDeployment,
	RELEASE_SHA_META_KEY,
} from "./staged-deployment.mjs";

const SHA = "8ae32c1aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

/** 필요한 값만 덮어써 배포 하나를 만듭니다. 기본값은 이 커밋의 승격 가능한 상용 배포입니다. */
const deployment = (overrides: Record<string, unknown> = {}) => ({
	uid: "dpl_1",
	url: "web-memo-aaa.vercel.app",
	created: 1000,
	state: "READY",
	target: "production",
	meta: { [RELEASE_SHA_META_KEY]: SHA },
	...overrides,
});

describe("pickStagedDeployment", () => {
	it("이 커밋의 READY 상용 배포를 고르고 URL에 https를 붙인다", () => {
		expect(pickStagedDeployment({ deployments: [deployment()], sha: SHA })).toEqual({
			id: "dpl_1",
			url: "https://web-memo-aaa.vercel.app",
		});
	});

	it("다른 커밋의 배포는 고르지 않는다", () => {
		expect(
			pickStagedDeployment({
				deployments: [deployment({ meta: { [RELEASE_SHA_META_KEY]: "other" } })],
				sha: SHA,
			}),
		).toBeNull();
	});

	// 자동 메타(githubCommitSha)는 체크아웃 방식에 따라 값이 달라져 신뢰하지 않는다
	it("releaseSha 메타가 없고 githubCommitSha만 같은 배포는 고르지 않는다", () => {
		expect(
			pickStagedDeployment({
				deployments: [deployment({ meta: { githubCommitSha: SHA } })],
				sha: SHA,
			}),
		).toBeNull();
	});

	it.each(["BUILDING", "ERROR", "QUEUED", "CANCELED"])(
		"%s 상태의 배포는 승격할 수 없어 고르지 않는다",
		(state) => {
			expect(
				pickStagedDeployment({ deployments: [deployment({ state })], sha: SHA }),
			).toBeNull();
		},
	);

	it("프리뷰 대상 배포는 고르지 않는다", () => {
		expect(
			pickStagedDeployment({
				deployments: [deployment({ target: null })],
				sha: SHA,
			}),
		).toBeNull();
	});

	it("같은 커밋의 배포가 여럿이면 가장 나중에 만든 것을 고른다", () => {
		const picked = pickStagedDeployment({
			deployments: [
				deployment({ uid: "old", url: "old.vercel.app", created: 1000 }),
				deployment({ uid: "new", url: "new.vercel.app", created: 3000 }),
				deployment({ uid: "mid", url: "mid.vercel.app", created: 2000 }),
			],
			sha: SHA,
		});

		expect(picked?.id).toBe("new");
	});

	it("uid 대신 id로 오는 응답도 읽고 state 대신 readyState도 읽는다", () => {
		const picked = pickStagedDeployment({
			deployments: [
				deployment({ uid: undefined, id: "dpl_x", state: undefined, readyState: "READY" }),
			],
			sha: SHA,
		});

		expect(picked?.id).toBe("dpl_x");
	});

	it("url이 없으면(업로드 미완료) 고르지 않는다", () => {
		expect(
			pickStagedDeployment({ deployments: [deployment({ url: null })], sha: SHA }),
		).toBeNull();
	});

	it("sha가 비어 있거나 목록이 비면 null이다", () => {
		expect(pickStagedDeployment({ deployments: [deployment()], sha: "" })).toBeNull();
		expect(pickStagedDeployment({ deployments: [], sha: SHA })).toBeNull();
	});
});

describe("fetchProductionDeployments", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("상용 대상 READY 배포를 프로젝트·팀 범위로 조회한다", async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ deployments: [{ uid: "dpl_1" }] }),
		});
		vi.stubGlobal("fetch", fetchMock);

		const deployments = await fetchProductionDeployments({
			projectId: "prj_1",
			teamId: "team_1",
			token: "t0ken",
			apiUrl: "https://api.example.test",
		});
		const url = new URL(fetchMock.mock.calls[0][0]);

		expect(deployments).toEqual([{ uid: "dpl_1" }]);
		expect(url.origin + url.pathname).toBe("https://api.example.test/v6/deployments");
		expect(Object.fromEntries(url.searchParams)).toEqual({
			projectId: "prj_1",
			teamId: "team_1",
			target: "production",
			state: "READY",
			limit: "100",
		});
		expect(fetchMock.mock.calls[0][1].headers.authorization).toBe("Bearer t0ken");
	});

	it("응답이 실패하면 던진다", async () => {
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 403 }));

		await expect(
			fetchProductionDeployments({
				projectId: "prj_1",
				teamId: "team_1",
				token: "t0ken",
				apiUrl: "https://api.example.test",
			}),
		).rejects.toThrow("403");
	});
});
