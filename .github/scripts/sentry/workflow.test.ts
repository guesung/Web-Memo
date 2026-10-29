import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

const raw = readFileSync(
	new URL("../../workflows/chore-sentry-triage.yml", import.meta.url),
	"utf8",
);
const workflow = parse(raw);
const jobs = workflow.jobs;
const stepsOf = (job: string): Array<Record<string, any>> => jobs[job].steps;

describe("Sentry 분석 워크플로 불변식", () => {
	it("입력은 env 로만 쓰고 run 본문에 inputs 를 보간하지 않는다", () => {
		for (const job of Object.values<any>(jobs)) {
			for (const step of job.steps) {
				if (step.run) expect(step.run).not.toMatch(/\$\{\{\s*(inputs|github\.event)/);
			}
		}
	});

	it("동시 실행을 큐로 직렬화한다", () => {
		expect(workflow.concurrency).toEqual({
			group: "sentry-triage",
			"cancel-in-progress": false,
		});
	});

	it("분석 잡의 Claude 는 Bash 없이 Read,Grep,Glob,Edit,Write 만 쓴다", () => {
		const claude = stepsOf("analyze").find((step) =>
			String(step.uses).startsWith("anthropics/claude-code-action"),
		)!;
		const args: string = claude.with.claude_args;
		expect(args).toMatch(/--allowedTools Read,Grep,Glob,Edit,Write\s/);
		expect(args).not.toMatch(/Bash/i);
		expect(claude.with.prompt).not.toMatch(/\$\{\{/);
	});

	it("쓰기 자격증명은 publish 에만 있다", () => {
		for (const name of ["guard", "analyze", "notify-failure"]) {
			const text = JSON.stringify(jobs[name]);
			expect(text).not.toContain("APP_PRIVATE_KEY");
			expect(text).not.toContain("create-github-app-token");
		}
		expect(JSON.stringify(jobs.publish)).toContain("APP_PRIVATE_KEY");
		expect(jobs.analyze.permissions.contents).toBe("read");
	});

	it("SENTRY_API_TOKEN 은 fetch step 에만, Claude 토큰은 Claude step 에만 있다", () => {
		for (const [name, job] of Object.entries<any>(jobs)) {
			for (const step of job.steps) {
				const text = JSON.stringify(step);
				if (text.includes("SENTRY_API_TOKEN")) {
					expect(name).toBe("analyze");
					expect(step.name).toBe("Fetch sanitized Sentry context");
				}
				if (text.includes("CLAUDE_CODE_OAUTH_TOKEN")) {
					expect(String(step.uses)).toContain("claude-code-action");
				}
			}
			expect(JSON.stringify(job.env ?? {})).not.toMatch(/secrets\./);
		}
	});

	it("분석 잡 checkout 은 자격증명을 남기지 않는다", () => {
		const checkout = stepsOf("analyze").find((step) =>
			String(step.uses).startsWith("actions/checkout"),
		)!;
		expect(checkout.with["persist-credentials"]).toBe(false);
	});

	it("publish 는 생성 코드를 실행하지 않는다(pnpm 없음, claude 없음)", () => {
		expect(JSON.stringify(jobs.publish)).not.toMatch(/pnpm|claude-code-action/);
	});

	it("PR 은 draft 가 아니고 자동 머지를 하지 않는다", () => {
		expect(raw).toContain("gh pr create --base master");
		expect(raw).not.toMatch(/--draft|--auto|gh pr merge|--admin/);
	});

	it("guard 가 건너뛰면 analyze 는 실행되지 않고, 실패는 notify-failure 가 받는다", () => {
		expect(jobs.analyze.if).toContain("needs.guard.outputs.proceed == 'true'");
		expect(jobs["notify-failure"].if).toBe("${{ failure() }}");
		expect(jobs["notify-failure"].needs).toEqual(["guard", "analyze", "publish"]);
	});

	it("dry_run 에서는 App 토큰을 만들지 않고 패치를 적용하지 않는다", () => {
		const publish = stepsOf("publish");
		const token = publish.find((step) => step.id === "app-token")!;
		const apply = publish.find((step) => step.id === "apply")!;
		expect(token.if).toContain("inputs.dry_run != true");
		expect(apply.if).toContain("inputs.dry_run != true");
	});
});
