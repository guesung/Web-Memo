const FOLLOWUP_START = "<!-- ai-followup:start -->";
const FOLLOWUP_END = "<!-- ai-followup:end -->";
const FOLLOWUP_HEADING = "## 🔭 후속 작업 (시니어 리뷰)";
const CHECKBOX_PATTERN = /^-\s\[([ xX])\]\s+(.*)$/;

/** 섹션 내부의 체크리스트 한 줄 */
interface IFChecklistItem {
	checked: boolean;
	text: string;
}

const parseChecklist = (section: string): IFChecklistItem[] => {
	const items: IFChecklistItem[] = [];

	for (const line of section.split(/\r\n|\n/)) {
		const matched = line.trim().match(CHECKBOX_PATTERN);

		if (matched === null) {
			continue;
		}

		items.push({ checked: matched[1].toLowerCase() === "x", text: matched[2].trim() });
	}

	return items;
};

const renderSection = (items: IFChecklistItem[]): string => {
	const lines = items.map((item) => `- [${item.checked ? "x" : " "}] ${item.text}`);

	return [FOLLOWUP_START, FOLLOWUP_HEADING, "", ...lines, FOLLOWUP_END].join("\n");
};

/**
 * PR 본문의 후속 작업 마커 섹션을 갱신한다.
 * @description 마커 쌍이 온전하면 그 사이만 교체해 PR 템플릿 내용을 보존하고,
 * 마커가 없거나 한쪽만 있어 손상된 경우에는 덮어쓰지 않고 본문 끝에 새 섹션을 만든다.
 * 기존 항목은 체크 상태를 유지한 채 누적하며, 같은 문구는 중복 추가하지 않는다.
 */
export const upsertFollowupSection = ({
	body,
	items,
}: {
	body: string;
	items: string[];
}): string => {
	if (items.length === 0) {
		return body;
	}

	const startIndex = body.indexOf(FOLLOWUP_START);
	const endIndex = body.indexOf(FOLLOWUP_END);
	const isIntact = startIndex !== -1 && endIndex !== -1 && endIndex > startIndex;

	const existing = isIntact
		? parseChecklist(body.slice(startIndex + FOLLOWUP_START.length, endIndex))
		: [];

	const merged = [...existing];

	for (const text of items) {
		const trimmed = text.trim();

		if (merged.some((item) => item.text === trimmed)) {
			continue;
		}

		merged.push({ checked: false, text: trimmed });
	}

	const section = renderSection(merged);

	if (isIntact) {
		return body.slice(0, startIndex) + section + body.slice(endIndex + FOLLOWUP_END.length);
	}

	return body.length === 0 ? section : `${body.trimEnd()}\n\n${section}`;
};
