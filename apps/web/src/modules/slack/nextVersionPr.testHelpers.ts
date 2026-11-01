import { vi } from "vitest";

/** 테스트용 가짜 GitHub·Slack. 호출을 기록하고, `"METHOD /경로"` 키로 응답을 덮어쓸 수 있습니다. */

export const MASTER_SHA = "a".repeat(40);
export const RESPONSE_URL = "https://hooks.slack.test/response";
export const MERGE_SHA = "m".repeat(40);

export interface IFRecordedCall {
	method: string;
	/** `/repos/<owner>/<repo>` 뒤의 경로(쿼리 포함). Slack은 호스트 뒤 경로 전체. */
	path: string;
	body?: unknown;
}

type TResponder = (call: IFRecordedCall) => {
	status?: number;
	json?: unknown;
	text?: string;
};

const ok = (json: unknown) => ({ json });

export const installFakeFetch = (
	overrides: Record<
		string,
		TResponder | { status: number; json?: unknown }
	> = {},
	{
		extensionVersion = "1.11.5",
		openPrNumber,
	}: { extensionVersion?: string; openPrNumber?: number } = {},
) => {
	const calls: IFRecordedCall[] = [];

	const defaults: Record<string, TResponder> = {
		"GET /git/ref/heads/master": () => ok({ object: { sha: MASTER_SHA } }),
		[`GET /git/commits/${MASTER_SHA}`]: () =>
			ok({ tree: { sha: "base-tree" } }),
		"POST /git/blobs": () => ok({ sha: "blob" }),
		"POST /git/trees": () => ok({ sha: "tree" }),
		"POST /git/commits": () => ok({ sha: "new-commit" }),
		"POST /git/refs": () => ok({}),
		"PATCH /git/refs/heads/chore/next-version-extension": () => ok({}),
		"PATCH /git/refs/heads/chore/next-version-app": () => ok({}),
		"POST /pulls": () => ok({ number: 9 }),
		[`PATCH /pulls/${openPrNumber}`]: () => ok({}),
		[`PUT /pulls/${openPrNumber ?? 9}/merge`]: () =>
			ok({ sha: MERGE_SHA, merged: true }),
		"POST /actions/workflows/release.yml/dispatches": () => ({ status: 204 }),
	};

	const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
		const parsed = new URL(url);
		const method = init?.method ?? "GET";
		const body = init?.body ? JSON.parse(String(init.body)) : undefined;
		const path =
			parsed.pathname.replace("/repos/guesung/Web-Memo", "") + parsed.search;
		const call: IFRecordedCall = {
			method,
			path: parsed.host === "api.github.com" ? path : parsed.pathname,
			body,
		};

		calls.push(call);

		let result: ReturnType<TResponder> | undefined;
		const key = `${method} ${path}`;

		if (parsed.host === "hooks.slack.test") {
			return {
				ok: true,
				status: 200,
				text: async () => "ok",
				json: async () => ({}),
			};
		}

		if (parsed.host === "slack.com") {
			return {
				ok: true,
				status: 200,
				json: async () => ({ ok: true, view: { id: "V1" } }),
				text: async () => "",
			};
		}

		const override = overrides[key];

		if (override) {
			result = typeof override === "function" ? override(call) : override;
		} else if (path.includes("/contents/apps/chrome-extension/package.json")) {
			result = {
				text: JSON.stringify(
					{ name: "chrome-extension", version: extensionVersion },
					null,
					2,
				),
			};
		} else if (path.includes("/contents/apps/app/app.json")) {
			result = {
				text: JSON.stringify({ expo: { version: "2.4.9" } }, null, 2),
			};
		} else if (method === "GET" && path.startsWith("/pulls?head=")) {
			result = ok(openPrNumber ? [{ number: openPrNumber }] : []);
		} else if (method === "GET" && path.startsWith("/commits?")) {
			result = ok([]);
		} else {
			result = defaults[key]?.(call);
		}

		if (!result) throw new Error(`예상하지 못한 요청: ${key}`);

		const status = result.status ?? 200;
		const text = result.text ?? JSON.stringify(result.json ?? {});

		return {
			ok: status >= 200 && status < 300,
			status,
			text: async () => text,
			json: async () => JSON.parse(text),
		};
	});

	vi.stubGlobal("fetch", fetchMock);

	return {
		calls,
		/** GitHub 쓰기 요청(GET 제외)과 dispatch. */
		writes: () =>
			calls.filter(
				(call) => call.method !== "GET" && !call.path.startsWith("/response"),
			),
		slackTexts: () =>
			calls
				.filter((call) => call.path === "/response")
				.map((call) => call.body as { text: string; response_type: string }),
		dispatches: () => calls.filter((call) => call.path.endsWith("/dispatches")),
	};
};
