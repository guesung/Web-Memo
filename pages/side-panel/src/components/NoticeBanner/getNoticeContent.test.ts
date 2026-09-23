import type { NoticeRow } from "@web-memo/shared/types";
import { describe, expect, it } from "vitest";
import { getNoticeContent } from "./getNoticeContent";

const createNotice = (overrides: Partial<NoticeRow> = {}): NoticeRow => ({
	id: 1,
	title_ko: "한국어 제목",
	title_en: "English title",
	body_ko: "한국어 본문",
	body_en: "English body",
	link_label_ko: "설정 열기",
	link_label_en: "Open settings",
	link_target: "open_options",
	starts_at: null,
	ends_at: null,
	created_at: "2026-09-23T00:00:00Z",
	...overrides,
});

describe("사이드 패널 공지 문구", () => {
	it("UI 언어가 ko면 한국어, 아니면 영어 문구를 쓴다", () => {
		const koContent = getNoticeContent({
			notice: createNotice(),
			uiLanguage: "ko",
		});
		const enContent = getNoticeContent({
			notice: createNotice(),
			uiLanguage: "en-US",
		});

		expect(koContent.title).toBe("한국어 제목");
		expect(koContent.link?.label).toBe("설정 열기");
		expect(enContent.body).toBe("English body");
		expect(enContent.link?.label).toBe("Open settings");
	});

	it("해당 언어 값이 비어 있으면 다른 언어 값으로 대체한다", () => {
		const content = getNoticeContent({
			notice: createNotice({ title_en: " ", link_label_en: null }),
			uiLanguage: "en",
		});

		expect(content.title).toBe("한국어 제목");
		expect(content.link?.label).toBe("설정 열기");
	});

	it("링크 라벨이 양쪽 다 비면 label이 null이다", () => {
		const content = getNoticeContent({
			notice: createNotice({ link_label_ko: "", link_label_en: null }),
			uiLanguage: "ko",
		});

		expect(content.link).toEqual({ label: null, target: { type: "options" } });
	});

	it("https URL은 새 탭 대상으로, null·그 외 값은 링크 없음으로 본다", () => {
		const getLink = (linkTarget: string | null) =>
			getNoticeContent({
				notice: createNotice({ link_target: linkTarget }),
				uiLanguage: "ko",
			}).link;

		expect(getLink("https://www.webmemo.xyz/ko")?.target).toEqual({
			type: "url",
			url: "https://www.webmemo.xyz/ko",
		});
		expect(getLink(null)).toBeNull();
		expect(getLink("http://www.webmemo.xyz")).toBeNull();
		expect(getLink("javascript:alert(1)")).toBeNull();
		expect(getLink("open_something")).toBeNull();
	});
});
