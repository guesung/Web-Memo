import {
	analytics,
	type TAnalyticsEvent,
} from "@web-memo/shared/modules/analytics";

type ResultParams = Extract<
	TAnalyticsEvent,
	{ name: "past_memo_view_result" }
>["params"];

export interface PastMemoAttempt {
	account: number;
	userId: string;
	scope: string;
	source: "rule" | "jev";
	startedAt: number;
	terminal: boolean;
	displayedExisting: boolean;
	reused: boolean;
}

export function classifyPastMemoAge(
	createdAt: string | null,
	startedAt: number,
): ResultParams["action"] {
	const created = createdAt ? Date.parse(createdAt) : Number.NaN;
	if (!Number.isFinite(created) || created > startedAt) return "unknown";
	return created <= startedAt - 24 * 60 * 60 * 1000 ? "existing" : "recent";
}

function track(event: TAnalyticsEvent) {
	try {
		void Promise.resolve(analytics.trackEvent(event)).catch(() => {});
	} catch {
		// 계측 실패가 메모 열기나 원문 이동을 막지 않는다.
	}
}

/** 패널 메모리에만 남는 시도 상태. 종료 확정과 계정 검증을 모든 콜백이 공유한다. */
export class PastMemoTracking {
	private userId: string | undefined;
	private account = 0;
	private scope = "";
	current: PastMemoAttempt | null = null;

	updateContext(userId: string | undefined, scope: string) {
		if (this.userId !== userId) {
			this.userId = userId;
			this.account += 1;
			this.current = null;
		}
		this.scope = scope;
	}

	isCurrent(attempt: PastMemoAttempt) {
		return (
			this.current === attempt &&
			this.isSameAccount(attempt) &&
			attempt.scope === this.scope
		);
	}

	private isSameAccount(attempt: PastMemoAttempt) {
		return attempt.account === this.account && attempt.userId === this.userId;
	}

	cancelOutsideScope(scope: string) {
		if (this.current && this.current.scope !== scope)
			this.finish(this.current, "cancelled");
	}

	start(source: PastMemoAttempt["source"]) {
		if (this.current) this.finish(this.current, "cancelled");
		if (!this.userId) return null;
		const attempt: PastMemoAttempt = {
			account: this.account,
			userId: this.userId,
			scope: this.scope,
			source,
			startedAt: Date.now(),
			terminal: false,
			displayedExisting: false,
			reused: false,
		};
		this.current = attempt;
		track({ name: "past_memo_view_start", params: { source } });
		return attempt;
	}

	finish(
		attempt: PastMemoAttempt,
		reason: ResultParams["reason"],
		action: ResultParams["action"] = "unknown",
	) {
		if (
			attempt.terminal ||
			!this.isSameAccount(attempt) ||
			this.current !== attempt
		)
			return;
		if (reason !== "cancelled" && !this.isCurrent(attempt)) return;
		attempt.terminal = true;
		attempt.displayedExisting = reason === "displayed" && action === "existing";
		track({
			name: "past_memo_view_result",
			params: {
				source: attempt.source,
				is_success: reason === "displayed",
				reason,
				action,
			},
		});
	}

	captureReuse(attempt: PastMemoAttempt) {
		const eligible = this.isCurrent(attempt) && attempt.displayedExisting;
		return () => {
			// 탭 생성이 scope를 바꿔도 클릭 당시 시도와 같은 계정이면 완료한다.
			if (!eligible || !this.isSameAccount(attempt) || attempt.reused) return;
			attempt.reused = true;
			track({
				name: "past_memo_reuse",
				params: { source: attempt.source, action: "source_open" },
			});
		};
	}
}
