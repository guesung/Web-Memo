// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MemoCandidateList from "./MemoCandidateList";

vi.mock("@web-memo/shared/utils/extension", () => ({
	I18n: {
		get: (key: string, ...substitutions: string[]) =>
			[key, ...substitutions].join(":"),
	},
}));
vi.mock("@web-memo/ui", () => ({
	Button: (props: Record<string, unknown>) =>
		createElement("button", { type: "button", ...props }),
}));
// 컴포넌트가 이벤트를 보내면서 analytics를 불러옵니다. 실제 모듈은 환경 변수가 없는 테스트에서 불러오는 순간 실패합니다.
vi.mock("@web-memo/shared/modules/analytics", () => ({
	analytics: { trackEvent: vi.fn() },
}));
vi.mock("@src/utils", () => ({
	getOfflineControlDisabledReason: () => undefined,
}));

const createMemo = (id: number, title: string) =>
	({
		id,
		title,
		url: `https://example.com/page?id=${id}`,
		memo: `${title} 본문`,
		updated_at: "2026-11-01T00:00:00Z",
	}) as Parameters<typeof MemoCandidateList>[0]["memos"][number];

let root: Root;
const onNewMemoClick = vi.fn();

const render = async (
	props: Partial<Parameters<typeof MemoCandidateList>[0]> = {},
) => {
	await act(async () =>
		root.render(
			createElement(MemoCandidateList, {
				memos: [],
				otherUrlMemos: [],
				onMemoSelect: vi.fn(),
				onMemoDelete: vi.fn(),
				onNewMemoClick,
				...props,
			}),
		),
	);
};

beforeEach(() => {
	vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
	onNewMemoClick.mockReset();
	document.body.innerHTML = "<div id='root'></div>";
	root = createRoot(document.getElementById("root") as HTMLElement);
});

afterEach(async () => {
	await act(async () => root.unmount());
	vi.unstubAllGlobals();
});

describe("MemoCandidateList", () => {
	it("현재 주소 메모 수를 제목에 쓰고 새 메모 작성을 맨 위에 둔다", async () => {
		await render({ memos: [createMemo(1, "A"), createMemo(2, "B")] });

		expect(document.body.textContent).toContain("memo_candidates_title:2");
		expect(document.body.textContent).not.toContain(
			"memo_candidates_description",
		);
		const buttons = [...document.querySelectorAll("button")];
		expect(buttons[0]?.textContent).toBe("memo_candidates_new");
	});

	it("직전에 편집한 메모에만 편집 중을 붙인다", async () => {
		await render({
			memos: [createMemo(1, "A"), createMemo(2, "B")],
			editingMemoId: 2,
		});

		const markers = document.body.textContent?.match(
			/memo_candidates_current/g,
		);
		expect(markers).toHaveLength(1);
	});

	it("현재 주소 메모가 없고 다른 주소 메모만 있으면 기존 제목을 쓴다", async () => {
		await render({ otherUrlMemos: [createMemo(3, "C")] });

		expect(document.body.textContent).toContain("memo_candidates_title_choose");
		expect(document.body.textContent).not.toContain("memo_candidates_title:");
	});

	it("메모가 하나도 없으면 안내 문구와 새 메모 작성 버튼 하나만 보인다", async () => {
		await render();

		expect(document.body.textContent).toContain("memo_candidates_empty");
		const buttons = [...document.querySelectorAll("button")];
		expect(buttons).toHaveLength(1);
		await act(async () => buttons[0]?.click());
		expect(onNewMemoClick).toHaveBeenCalledTimes(1);
	});

	it("새 메모를 막는 사유가 있으면 버튼을 비활성화한다", async () => {
		await render({
			memos: [createMemo(1, "A")],
			newMemoDisabledReason: "offline",
		});

		const newButton = document.querySelector("button");
		expect(newButton?.disabled).toBe(true);
		expect(newButton?.title).toBe("offline");
	});
});
