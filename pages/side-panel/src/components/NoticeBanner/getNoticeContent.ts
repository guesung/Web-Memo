import type { NoticeRow } from "@web-memo/shared/types";

/**
 * 공지 행을 사이드 패널 UI 언어에 맞는 문구와 링크 동작으로 바꾼다.
 * @description 해당 언어 값이 비어 있으면 다른 언어 값을 쓴다. 링크 라벨이 양쪽 다 비면 label은 null이라
 * 호출하는 쪽이 기본 라벨을 채운다. link_target이 null·알 수 없는 값이면 link는 null이다.
 */
export const getNoticeContent = ({
	notice,
	uiLanguage,
}: IFGetNoticeContentParams): IFNoticeContent => {
	const isKorean = uiLanguage.toLowerCase().startsWith("ko");
	const pickText = (koText: string | null, enText: string | null) => {
		if (isKorean) {
			return pickFirstFilledText(koText, enText);
		}

		return pickFirstFilledText(enText, koText);
	};
	const linkTarget = parseNoticeLinkTarget(notice.link_target);

	return {
		title: pickText(notice.title_ko, notice.title_en) ?? "",
		body: pickText(notice.body_ko, notice.body_en) ?? "",
		link: linkTarget && {
			label: pickText(notice.link_label_ko, notice.link_label_en),
			target: linkTarget,
		},
	};
};

const pickFirstFilledText = (
	preferredText: string | null,
	fallbackText: string | null,
) => {
	if (preferredText?.trim()) {
		return preferredText;
	}
	if (fallbackText?.trim()) {
		return fallbackText;
	}

	return null;
};

const parseNoticeLinkTarget = (
	linkTarget: string | null,
): TNoticeLinkTarget | null => {
	if (linkTarget === "open_options") {
		return { type: "options" };
	}
	if (!linkTarget) {
		return null;
	}

	try {
		const url = new URL(linkTarget);
		if (url.protocol !== "https:") {
			return null;
		}

		return { type: "url", url: url.href };
	} catch {
		return null;
	}
};

/** 공지 링크가 여는 대상. 옵션 페이지 또는 새 탭으로 여는 https URL이다. */
export type TNoticeLinkTarget =
	| { type: "options" }
	| { type: "url"; url: string };

/** 사이드 패널에 그릴 공지 문구와 링크 */
export interface IFNoticeContent {
	title: string;
	body: string;
	/** 링크 줄을 그리지 않으면 null. label이 null이면 기본 라벨을 쓴다. */
	link: { label: string | null; target: TNoticeLinkTarget } | null;
}

/** getNoticeContent 인자 */
interface IFGetNoticeContentParams {
	notice: NoticeRow;
	/** chrome.i18n.getUILanguage() 값. 예: `ko`, `en-US` */
	uiLanguage: string;
}
