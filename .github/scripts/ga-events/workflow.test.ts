import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

const workflow = parse(
	readFileSync(
		new URL("../../workflows/chore-ga-events.yml", import.meta.url),
		"utf8",
	),
);
const steps = workflow.jobs.maintain.steps;
const step = (id: string) =>
	steps.find((value: { id?: string }) => value.id === id);

describe("GA 이벤트 자동 수정 경로", () => {
	it("변경 검증 실패를 로그에 남기고 수정 단계까지 진행한다", () => {
		expect(step("changes")["continue-on-error"]).toBe(true);
		expect(step("changes").run).toContain("set -euo pipefail");
		expect(step("changes").run).toContain(
			'tee "$GA_EVENTS_DIR/changes-initial.log"',
		);
	});

	it("변경 검증이 통과한 경우에만 의존성을 설치하고 처음 검증한다", () => {
		const install = steps.find(
			(value: { name: string }) => value.name === "Install dependencies",
		);
		expect(install.if).toBe(
			"steps.candidate.outputs.status == 'gap' && steps.changes.outcome == 'success'",
		);
		expect(step("verify_initial").if).toBe(install.if);
	});

	it("변경 검증 또는 품질 검증 실패를 한 번만 수정한다", () => {
		expect(step("fix_events").if).toBe(
			"steps.candidate.outputs.status == 'gap' && (steps.changes.outcome == 'failure' || steps.verify_initial.outcome == 'failure')",
		);
		expect(step("fix_events").with.prompt).toContain("changes-initial.log");
		expect(step("fix_events").with.prompt).toContain(
			"verification-initial.log",
		);
		expect(step("fix_events").with.prompt).toContain("docs/analytics.md");
		expect(
			steps.filter((value: { id?: string }) => value.id === "fix_events"),
		).toHaveLength(1);
	});

	it("수정 후 변경 범위를 확인한 다음 의존성을 설치하고 전체 검증한다", () => {
		const retryInstall = steps.find(
			(value: { name: string }) =>
				value.name === "Install dependencies after correction",
		);
		expect(retryInstall.if).toBe(
			"steps.fix_events.outcome == 'success' && steps.changes.outcome == 'failure'",
		);
		expect(retryInstall.run.indexOf("maintain.mjs changes")).toBeLessThan(
			retryInstall.run.indexOf("pnpm install"),
		);
		expect(steps.indexOf(retryInstall)).toBeGreaterThan(
			steps.indexOf(step("fix_events")),
		);
		expect(steps.indexOf(retryInstall)).toBeLessThan(
			steps.indexOf(step("verify_retry")),
		);
		expect(step("verify_retry").if).toBe(
			"steps.fix_events.outcome == 'success'",
		);
		expect(step("verify_retry")["continue-on-error"]).toBeUndefined();
		expect(step("verify_retry").run).toContain(
			".github/scripts/ga-events/verify.sh",
		);
	});

	it("검증에 성공한 변경만 내보낸다", () => {
		expect(step("export_patch").if).toBe(
			"steps.candidate.outputs.status == 'gap' && (steps.verify_initial.outcome == 'success' || steps.verify_retry.outcome == 'success')",
		);
		const verify = readFileSync(
			new URL("./verify.sh", import.meta.url),
			"utf8",
		);
		expect(verify).toContain("maintain.mjs changes");
		expect(verify).toContain("pnpm check");
		expect(verify).toContain("pnpm type-check");
	});
});
