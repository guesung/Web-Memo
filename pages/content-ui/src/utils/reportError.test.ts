// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	config: { webUrl: "https://webmemo.example", buildEnv: "production" },
	sentEnvelopes: [] as string[],
}));

vi.mock("@web-memo/env", () => ({ CONFIG: mocks.config }));

// 실제 SDK로 이벤트를 만들고, 전송만 가로채 실린 내용을 확인한다.
vi.mock("@sentry/react", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@sentry/react")>();

	return {
		...actual,
		makeFetchTransport: (
			options: Parameters<typeof actual.makeFetchTransport>[0],
		) =>
			actual.createTransport(options, async (request) => {
				mocks.sentEnvelopes.push(String(request.body));

				return { statusCode: 200 };
			}),
	};
});

import { reportContentUiError } from "./reportError";

/** 봉투(envelope)의 줄 가운데 이벤트 본문을 꺼낸다. */
const getSentEvent = (envelope: string) =>
	envelope
		.split("\n")
		.filter((line) => line.trim())
		.map((line) => JSON.parse(line))
		.find((item) => item.exception);

beforeEach(() => {
	mocks.config.buildEnv = "production";
	mocks.sentEnvelopes.length = 0;
	vi.stubGlobal("chrome", {
		runtime: {
			id: "extension-id",
			getManifest: () => ({ version: "1.10.19" }),
		},
	});
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("reportContentUiError", () => {
	it("리포터가 정한 태그·심각도·지문과 확장 버전을 이벤트에 싣는다", async () => {
		reportContentUiError({
			error: new Error("Could not establish connection"),
			feature: "highlight",
			operation: "create",
			stage: "request",
			level: "warning",
		});

		await vi.waitFor(() => expect(mocks.sentEnvelopes).toHaveLength(1));
		const event = getSentEvent(mocks.sentEnvelopes[0]);

		expect(event.release).toBe("1.10.19");
		expect(event.level).toBe("warning");
		expect(event.tags).toMatchObject({
			feature: "highlight",
			operation: "create",
			stage: "request",
		});
		expect(event.fingerprint).toEqual(["highlight", "create", "request"]);
		expect(event.exception.values.at(-1).value).toBe(
			"[highlight/create/request] Could not establish connection",
		);
	});

	it("개발 빌드에서는 보내지 않는다", async () => {
		mocks.config.buildEnv = "development";

		reportContentUiError({
			error: new Error("development only"),
			feature: "highlight",
			operation: "edit",
			stage: "request",
		});

		await new Promise((resolve) => setTimeout(resolve, 50));
		expect(mocks.sentEnvelopes).toHaveLength(0);
	});

	it("확장이 업데이트돼 연결이 끊긴 content script에서는 보내지 않는다", async () => {
		vi.stubGlobal("chrome", { runtime: {} });

		reportContentUiError({
			error: new Error("Extension context invalidated."),
			feature: "highlight",
			operation: "restore",
			stage: "request",
		});

		await new Promise((resolve) => setTimeout(resolve, 50));
		expect(mocks.sentEnvelopes).toHaveLength(0);
	});
});
