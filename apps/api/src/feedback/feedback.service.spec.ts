import type { ConfigService } from "@nestjs/config";
import type { Env } from "../config/env.validation.js";
import type { SlackService } from "../slack/slack.service.js";
import { FeedbackService } from "./feedback.service.js";

const createService = (webUrl?: string) => {
	const config = { get: () => webUrl } as unknown as ConfigService<Env, true>;

	return new FeedbackService(config, {} as SlackService);
};

const record = {
	id: "8f6f1c1e-6c4b-4f4f-9c1d-2b2f0c1a9e11",
	content: "검색이 느려요",
	created_at: "2026-11-23T06:00:00.000Z",
};

describe("FeedbackService.buildMessage", () => {
	it("비로그인 피드백은 작성자를 비로그인으로 쓰고 선택 줄을 뺀다", () => {
		expect(createService().buildMessage(record)).toBe(
			[
				":speech_balloon: 새 피드백",
				"검색이 느려요",
				"작성자 비로그인 · 2026-11-23T06:00:00.000Z",
			].join("\n"),
		);
	});

	it("회신 주소·출처·관리자 링크가 있으면 순서대로 붙인다", () => {
		const message = createService("https://www.webmemo.test/").buildMessage({
			...record,
			email: "a@b.test",
			source_path: "/ko/memos",
		});

		expect(message.split("\n").slice(3)).toEqual([
			"회신 a@b.test",
			"출처 /ko/memos",
			`https://www.webmemo.test/ko/admin/feedback?id=${record.id}`,
		]);
	});
});
