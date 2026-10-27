import {
	ANALYTICS,
	ANALYTICS_EXCLUDED_STORAGE_KEY,
} from "@web-memo/shared/constants";
import { describe, expect, it } from "vitest";
import {
	adoptExtensionClientIdScript,
	disableExcludedScript,
	queueAnalyticsScript,
} from "./bootstrapScripts";

describe("GA/GTM 초기 큐", () => {
	it("제외 플래그와 확장 client_id를 먼저 반영하고 최초 페이지를 한 번만 설정한다", () => {
		const extensionClientId = "123e4567-e89b-12d3-a456-426614174000";
		const initialUrl = `https://www.webmemo.xyz/ko/install?ext_cid=${extensionClientId}`;
		const browserWindow: Record<string, unknown> = {};
		const browserDocument = { title: "설치 안내", cookie: "" };
		const browserLocation = {
			href: initialUrl,
			search: `?ext_cid=${extensionClientId}`,
		};
		const browserStorage = {
			getItem: (key: string) =>
				key === ANALYTICS_EXCLUDED_STORAGE_KEY ? "1" : null,
		};
		const run = (script: string) =>
			new Function("window", "document", "location", "localStorage", script)(
				browserWindow,
				browserDocument,
				browserLocation,
				browserStorage,
			);

		run(disableExcludedScript);
		run(adoptExtensionClientIdScript);
		run(queueAnalyticsScript);

		expect(browserWindow[`ga-disable-${ANALYTICS.gaId}`]).toBe(true);
		expect(browserDocument.cookie).toContain(`_ga=GA1.1.${extensionClientId}`);
		const commands = (browserWindow.dataLayer as unknown[]).map((entry) =>
			Object.prototype.toString.call(entry) === "[object Arguments]"
				? Array.from(entry as IArguments)
				: entry,
		);
		expect(
			commands.filter((entry) => Array.isArray(entry) && entry[0] === "config"),
		).toEqual([
			[
				"config",
				ANALYTICS.gaId,
				{ page_location: initialUrl, page_title: "설치 안내" },
			],
		]);
		expect(
			commands.filter(
				(entry) => (entry as { event?: string }).event === "gtm.js",
			),
		).toHaveLength(1);
		expect(commands).toHaveLength(3);
	});
});
