import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	captureException: vi.fn(),
	flush: vi.fn(),
	create: vi.fn(),
}));

vi.mock("@web-memo/env", () => ({
	CONFIG: { webUrl: "https://webmemo.example", buildEnv: "development" },
}));
vi.mock("@sentry/nextjs", () => ({
	captureException: mocks.captureException,
	flush: mocks.flush,
}));
vi.mock("openai", () => ({
	default: class {
		chat = { completions: { create: mocks.create } };
	},
}));

const { createStreamingResponse, handleOpenAIError } = await import("./util");

/** 같은 리포터의 중복 억제에 걸리지 않도록 테스트마다 다른 메시지를 쓴다. */
const getReportedContext = () => mocks.captureException.mock.calls[0][1];

beforeEach(() => {
	mocks.captureException.mockReset();
	mocks.flush.mockReset().mockResolvedValue(true);
	mocks.create.mockReset();
});

describe("handleOpenAIError", () => {
	it("한도 초과는 429로 응답하고 warning으로 보고한다", () => {
		const response = handleOpenAIError(
			new Error("429 You exceeded your current quota (case-quota)"),
			"summary",
		);

		expect(response.status).toBe(429);
		expect(getReportedContext()).toMatchObject({
			level: "warning",
			tags: { feature: "summary", operation: "openai-api", stage: "quota" },
		});
	});

	it("API 키 오류는 500으로 응답하고 error로 보고한다", () => {
		const response = handleOpenAIError(
			new Error("Incorrect API key provided (case-key)"),
			"chat",
		);

		expect(response.status).toBe(500);
		expect(getReportedContext()).toMatchObject({
			level: "error",
			tags: { feature: "chat", stage: "api_key" },
		});
	});

	it("입력이 너무 길어서 생긴 오류는 400으로 응답하고 보고하지 않는다", () => {
		const response = handleOpenAIError(
			new Error("context_length_exceeded (case-context)"),
			"webpage-qa",
		);

		expect(response.status).toBe(400);
		expect(mocks.captureException).not.toHaveBeenCalled();
	});

	it("분류할 수 없는 오류와 Error가 아닌 값은 500으로 응답하고 보고한다", () => {
		const errorResponse = handleOpenAIError(
			new Error("upstream exploded (case-general)"),
			"category",
		);
		const valueResponse = handleOpenAIError(
			"문자열 오류 (case-value)",
			"category",
		);

		expect(errorResponse.status).toBe(500);
		expect(valueResponse.status).toBe(500);
		expect(mocks.captureException).toHaveBeenCalledTimes(2);
		expect(getReportedContext()).toMatchObject({
			tags: { feature: "category", stage: "general" },
		});
	});

	it("보고 이벤트를 응답 뒤에 flush한다", async () => {
		handleOpenAIError(new Error("upstream exploded (case-flush)"), "summary");
		await vi.waitFor(() => expect(mocks.flush).toHaveBeenCalledWith(2000));
	});
});

describe("createStreamingResponse", () => {
	it("스트리밍 도중 OpenAI가 실패하면 오류 이벤트를 내려주고 보고한다", async () => {
		mocks.create.mockRejectedValue(
			new Error("429 You exceeded your current quota (case-stream)"),
		);

		const response = createStreamingResponse(
			[{ role: "user", content: "요약해줘" }],
			"summary",
		);
		const body = await response.text();

		expect(body).toContain('"error"');
		expect(getReportedContext()).toMatchObject({
			level: "warning",
			tags: { feature: "summary", operation: "openai-api", stage: "quota" },
		});
	});

	it("정상 완료된 스트림은 보고하지 않는다", async () => {
		mocks.create.mockResolvedValue(
			(async function* () {
				yield { choices: [{ delta: { content: "안녕" } }] };
			})(),
		);

		const response = createStreamingResponse(
			[{ role: "user", content: "요약해줘" }],
			"summary",
		);
		const body = await response.text();

		expect(mocks.create).toHaveBeenCalledWith({
			model: "gpt-6-luna",
			reasoning_effort: "none",
			messages: [{ role: "user", content: "요약해줘" }],
			stream: true,
			temperature: 0.3,
		});
		expect(body).toBe('data: {"content":"안녕"}\n\ndata: [DONE]\n\n');
		expect(mocks.captureException).not.toHaveBeenCalled();
	});
});
