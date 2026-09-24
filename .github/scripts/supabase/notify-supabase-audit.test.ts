import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/** 정기 감사 Slack 알림 실행 파일 경로입니다. */
const SCRIPT_PATH = ".github/scripts/supabase/notify-supabase-audit.mjs";

describe("Supabase 감사 Slack 알림", () => {
	it("알릴 이상이 있는데 webhook이 없으면 실패한다", () => {
		const resultPath = join(tmpdir(), `supabase-audit-warning-${process.pid}.json`);
		writeFileSync(resultPath, JSON.stringify({ errorCount: 0, warningCount: 1, slackMessage: "warning" }));
		const result = spawnSync(process.execPath, [SCRIPT_PATH], {
			env: { SUPABASE_AUDIT_RESULT_PATH: resultPath },
			encoding: "utf8",
		});

		expect(result.status).toBe(1);
		expect(result.stderr).toContain("SLACK_WEBHOOK_URL");
	});

	it("알릴 이상이 없으면 webhook 없이 성공한다", () => {
		const resultPath = join(tmpdir(), `supabase-audit-clean-${process.pid}.json`);
		writeFileSync(resultPath, JSON.stringify({ errorCount: 0, warningCount: 0, slackMessage: "clean" }));
		const result = spawnSync(process.execPath, [SCRIPT_PATH], {
			env: { SUPABASE_AUDIT_RESULT_PATH: resultPath },
			encoding: "utf8",
		});

		expect(result.status).toBe(0);
		expect(result.stdout).toContain("알릴 이상이 없습니다");
	});
});
