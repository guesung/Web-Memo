const FOLLOWUP_START = "<!-- ai-followup:start -->";
const FOLLOWUP_END = "<!-- ai-followup:end -->";
const FOLLOWUP_HEADING = "## 🔭 후속 작업 (시니어 리뷰)";
const CHECKBOX_PATTERN = /^[-*+]\s+\[([ xX])\]\s+(.*)$/;

/**
 * 항목 텍스트를 중복 비교용으로 정규화한다.
 * @description 앞뒤 공백을 제거하고 내부 공백 연속을 한 칸으로 접은 뒤 소문자로 바꾼다.
 * 비교에만 쓰며, 실제로 저장·렌더링되는 텍스트는 원본 그대로 유지한다.
 */
const normalizeForComparison = (text: string): string =>
	text.trim().replace(/\s+/g, " ").toLowerCase();

/**
 * 섹션 원문에서 기존 체크리스트 항목들의 정규화된 텍스트 집합을 뽑아낸다.
 * @description 렌더링에는 쓰지 않는다 — 섹션 원문(체크박스가 아닌 산문·소제목 포함)은
 * 그대로 보존하고, 이 함수는 오직 중복 판정을 위한 조회 집합을 만드는 데만 쓰인다.
 */
const extractNormalizedItemTexts = (section: string): Set<string> => {
	const texts = new Set<string>();

	for (const line of section.split(/\r\n|\n/)) {
		const matched = line.trim().match(CHECKBOX_PATTERN);

		if (matched === null) {
			continue;
		}

		texts.add(normalizeForComparison(matched[2]));
	}

	return texts;
};

/** 신규 항목 텍스트들을 미체크 상태의 체크리스트 줄로 렌더링한다 */
const renderChecklistLines = (items: string[]): string =>
	items.map((item) => `- [ ] ${item}`).join("\n");

/**
 * 마커 쌍이 온전한 섹션에 신규 항목을 append한다.
 * @description 섹션 내부의 기존 내용은 체크박스든 사람이 남긴 산문·소제목이든
 * 절대 재작성하지 않고, end 마커 바로 앞에 신규 항목 줄만 삽입한다.
 * 이미 존재하는 항목(공백 정규화·대소문자 무시 비교 기준)은 다시 추가하지 않으며,
 * 신규 항목이 하나도 없으면 본문을 바이트 단위로 그대로 반환한다.
 */
const appendItemsIntoIntactSection = ({
	body,
	startIndex,
	endIndex,
	items,
}: {
	body: string;
	startIndex: number;
	endIndex: number;
	items: string[];
}): string => {
	const section = body.slice(startIndex + FOLLOWUP_START.length, endIndex);
	const existingNormalized = extractNormalizedItemTexts(section);
	const newItems: string[] = [];

	for (const text of items) {
		const trimmed = text.trim();
		const normalized = normalizeForComparison(trimmed);

		if (existingNormalized.has(normalized)) {
			continue;
		}

		existingNormalized.add(normalized);
		newItems.push(trimmed);
	}

	if (newItems.length === 0) {
		return body;
	}

	const before = body.slice(0, endIndex);
	const needsLeadingNewline = before.length > 0 && !before.endsWith("\n");
	const insertion = `${needsLeadingNewline ? "\n" : ""}${renderChecklistLines(newItems)}\n`;

	return before + insertion + body.slice(endIndex);
};

/**
 * 마커가 없거나 한쪽만 있어 손상된 경우 본문 끝에 새 섹션을 만든다.
 * @description 기존 본문은 절대 덮어쓰지 않고 그대로 둔 채 새 섹션을 추가로 붙인다.
 */
const appendNewSection = ({ body, items }: { body: string; items: string[] }): string => {
	const uniqueItems: string[] = [];
	const seenNormalized = new Set<string>();

	for (const text of items) {
		const trimmed = text.trim();
		const normalized = normalizeForComparison(trimmed);

		if (seenNormalized.has(normalized)) {
			continue;
		}

		seenNormalized.add(normalized);
		uniqueItems.push(trimmed);
	}

	const section = [
		FOLLOWUP_START,
		FOLLOWUP_HEADING,
		"",
		renderChecklistLines(uniqueItems),
		FOLLOWUP_END,
	].join("\n");

	return body.length === 0 ? section : `${body.trimEnd()}\n\n${section}`;
};

/**
 * PR 본문의 후속 작업 마커 섹션을 갱신한다.
 * @description 마커 쌍이 온전하면 섹션 내부에 사람이 남긴 기존 내용(체크박스든 산문·소제목·
 * 하위 불릿이든)을 절대 재작성하지 않고 보존하며, end 마커 바로 앞에 신규 항목만 append한다.
 * 이미 존재하는 항목은 공백 정규화·대소문자 무시 비교로 중복 추가하지 않는다.
 * 마커가 없거나 한쪽만 있어 손상된 경우에는 덮어쓰지 않고 본문 끝에 새 섹션을 만든다.
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

	if (isIntact) {
		return appendItemsIntoIntactSection({ body, startIndex, endIndex, items });
	}

	return appendNewSection({ body, items });
};
