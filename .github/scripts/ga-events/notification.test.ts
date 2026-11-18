import { describe, expect, it } from "vitest";
import { buildResultNotification } from "./notification.mjs";

const RUN_URL = "https://github.com/guesung/Web-Memo/actions/runs/1";
const PR_URL = "https://github.com/guesung/Web-Memo/pull/841";

describe("GA 이벤트 점검 결과 알림 문구", () => {
	it("PR을 게시하면 이벤트 이름과 PR 링크를 알린다", () => {
		const text = buildResultNotification(
			{
				status: "published",
				events: ["email_unsubscribe", "memo_candidate_select"],
				pullRequest: PR_URL,
			},
			RUN_URL,
		);
		expect(text).toContain("누락 이벤트 2종");
		expect(text).toContain("email_unsubscribe, memo_candidate_select");
		expect(text).toContain(`<${PR_URL}|PR 보기>`);
	});

	it("누락이 없으면 실행 로그 링크와 함께 알린다", () => {
		const text = buildResultNotification({ status: "none" }, RUN_URL);
		expect(text).toContain("누락된 이벤트가 없습니다");
		expect(text).toContain(`<${RUN_URL}|실행 로그 보기>`);
	});

	it("열린 PR 때문에 건너뛰면 그 PR 링크를 알린다", () => {
		const text = buildResultNotification(
			{ status: "duplicate", duplicatePullRequests: [PR_URL] },
			RUN_URL,
		);
		expect(text).toContain("건너뛰었습니다");
		expect(text).toContain(`<${PR_URL}|열린 PR 보기>`);
	});

	it("dry run이면 보내지 않는다", () => {
		expect(
			buildResultNotification({ status: "none", dryRun: true }, RUN_URL),
		).toBeNull();
	});

	it.each(["verified", "imported", "pending", "failed", "not-started"])(
		"%s 상태는 보내지 않는다",
		(status) => {
			expect(buildResultNotification({ status }, RUN_URL)).toBeNull();
		},
	);
});
