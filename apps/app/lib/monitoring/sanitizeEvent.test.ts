import type { ErrorEvent } from "@sentry/react-native";
import { expect, it } from "vitest";
import { filterAppBreadcrumb, sanitizeAppEvent } from "./sanitizeEvent";

it("URL과 사용자/요청 데이터는 제거하고 예외 스택은 유지한다", () => {
	const event: ErrorEvent = {
		type: undefined,
		message: "failed https://private.test/path?token=secret#memo",
		request: {
			url: "https://private.test",
			headers: { Authorization: "secret" },
		},
		user: { email: "private@example.test" },
		extra: { notification: "private text" },
		exception: {
			values: [
				{
					type: "URIError",
					value: "invalid webmemo://browser?url=secret",
					stacktrace: {
						frames: [{ function: "openArticle", vars: { url: "secret" } }],
					},
				},
			],
		},
		breadcrumbs: [
			{ category: "console", message: "private" },
			{
				category: "app.entry",
				message: "browser.load",
				data: { hasQuery: true },
			},
		],
	};
	const sanitized = sanitizeAppEvent(event);
	expect(sanitized.request).toBeUndefined();
	expect(sanitized.user).toBeUndefined();
	expect(sanitized.extra).toBeUndefined();
	expect(sanitized.message).toBe("failed [URL]");
	expect(sanitized.exception?.values?.[0].value).toBe("invalid [URL]");
	expect(sanitized.exception?.values?.[0].stacktrace?.frames?.[0]).toEqual({
		function: "openArticle",
	});
	expect(sanitized.breadcrumbs).toHaveLength(1);
});

it("자동 HTTP/console breadcrumb는 버리고 진입 단계만 허용한다", () => {
	expect(
		filterAppBreadcrumb({
			category: "http",
			data: { url: "https://private.test" },
		}),
	).toBeNull();
	expect(
		filterAppBreadcrumb({ category: "app.entry", message: "app.startup" }),
	).not.toBeNull();
});

it("percent encoded URL도 예외 메시지에서 제거한다", () => {
	expect(
		sanitizeAppEvent({
			type: undefined,
			message: "failed https%3A%2F%2Fprivate.test%2Fsecret",
		}).message,
	).toBe("failed [URL]");
});
