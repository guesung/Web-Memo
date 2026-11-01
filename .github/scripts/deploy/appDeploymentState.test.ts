import { describe, expect, it } from "vitest";
import {
	decideStagingApp,
	isValidatedRun,
	readDeploymentShas,
} from "./appDeploymentState.mjs";

const A = "a".repeat(40);
const B = "b".repeat(40);
const C = "c".repeat(40);
const FOREIGN = "d".repeat(40);
const lineage = [A, B, C];
function isAncestor(ancestor: string, descendant: string) {
	const index = lineage.indexOf(ancestor);
	return index >= 0 && index <= lineage.indexOf(descendant);
}

function decide(overrides = {}) {
	return decideStagingApp({
		sha: B,
		branchSha: C,
		validatedShas: [],
		deployedShas: [A],
		isAncestor,
		...overrides,
	});
}

describe("develop 앱 배포 계보", () => {
	it("A가 배포된 뒤 대기 B를 생략하고 최신 C는 A 이후 변경을 승계한다", () => {
		expect(decide({ validatedShas: [C] }).shouldBuild).toBe(false);
		expect(decide({ sha: C, validatedShas: [B, C] })).toMatchObject({
			shouldBuild: true,
			baseSha: A,
		});
	});

	it("검증 완료/요청 도착 순서가 역전돼도 최신 후손을 선택한다", () => {
		expect(decide({ validatedShas: [C, B] }).shouldBuild).toBe(false);
		expect(decide({ sha: C, validatedShas: [B] }).shouldBuild).toBe(true);
	});

	it("HEAD가 더 최신이어도 검증을 통과하지 않았다면 B를 배포한다", () => {
		expect(decide()).toMatchObject({ shouldBuild: true, baseSha: A });
	});

	it.each([B, C])(
		"동일/최신 성공 SHA %s가 있으면 중복·후퇴 배포를 생략한다",
		(sha) => {
			expect(decide({ deployedShas: [sha] }).shouldBuild).toBe(false);
		},
	);

	it("전체 CI 결과를 받지 않고 실제 앱 성공 SHA만 변경 기준으로 쓴다", () => {
		expect(decide({ sha: C, deployedShas: [A] }).baseSha).toBe(A);
	});

	it("성공 이력 도착 순서가 역전돼도 가장 가까운 성공 조상을 쓴다", () => {
		expect(decide({ sha: C, deployedShas: [B, A] }).baseSha).toBe(B);
	});

	it("reset으로 분리된 성공 이력과 검증 후보를 무시하고 전체 빌드한다", () => {
		expect(
			decide({ deployedShas: [FOREIGN], validatedShas: [FOREIGN] }),
		).toMatchObject({ shouldBuild: true, baseSha: null });
	});

	it("현재 develop 계보에서 제외된 옛 후보는 빌드하지 않는다", () => {
		expect(decide({ sha: FOREIGN }).shouldBuild).toBe(false);
	});

	it("성공 기준이 없으면 전체 빌드한다", () => {
		expect(decide({ deployedShas: [] })).toMatchObject({
			shouldBuild: true,
			baseSha: null,
		});
	});
});

describe("검증 후보와 앱 성공 marker", () => {
	it("전체 run 실패와 관계없이 ci와 changes 두 잡의 성공을 요구한다", () => {
		expect(
			isValidatedRun({
				jobs: [
					{ name: "ci", conclusion: "success" },
					{ name: "changes", conclusion: "success" },
					{ name: "cd-web", conclusion: "failure" },
				],
			}),
		).toBe(true);
	});

	it.each(["failure", "cancelled", null])(
		"검증 %s인 후보를 승계 대상으로 삼지 않는다",
		(conclusion) => {
			expect(
				isValidatedRun({
					jobs: [
						{ name: "ci", conclusion },
						{ name: "changes", conclusion: "success" },
					],
				}),
			).toBe(false);
		},
	);

	it("changes가 없거나 실패한 실행도 유효 후보가 아니다", () => {
		expect(
			isValidatedRun({ jobs: [{ name: "ci", conclusion: "success" }] }),
		).toBe(false);
	});

	it("플랫폼·브랜치·실제 SHA와 일치하고 만료되지 않은 marker만 읽는다", () => {
		const valid = {
			name: `staging-app-success-android-${A}-1-2`,
			expired: false,
			workflow_run: { head_branch: "develop", head_sha: A },
		};
		expect(
			readDeploymentShas({
				platform: "android",
				artifacts: [
					valid,
					{ ...valid, expired: true },
					{ ...valid, name: `staging-app-success-ios-${A}-1-2` },
					{ ...valid, workflow_run: { head_branch: "master", head_sha: A } },
					{ ...valid, workflow_run: { head_branch: "develop", head_sha: B } },
					{ ...valid, name: "android-build-staging" },
				],
			}),
		).toEqual([A]);
	});
});
