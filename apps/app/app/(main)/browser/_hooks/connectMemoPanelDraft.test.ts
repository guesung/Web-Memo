import { beforeEach, expect, it, vi } from "vitest";
import {
	editMemoAutoSaveSession,
	openMemoAutoSaveSession,
	setMemoAutoSaveOwner,
} from "../../../../lib/memoAutoSaveSession";
import { connectMemoPanelDraft } from "./connectMemoPanelDraft";

vi.mock(
	"@/lib/memoAutoSaveSession",
	async () => import("../../../../lib/memoAutoSaveSession"),
);
function createSession(id: number | string | null) {
	return openMemoAutoSaveSession({
		owner: "owner",
		tabId: "tab",
		pageKey: "page",
		url: "https://example.com",
		selectionId: id,
		targetId: id,
		draft: {
			title: "Title",
			memo: "existing",
			impression: "",
			actionItem: "",
			pendingLocalId: null,
			pendingSaveMode: null,
		},
	});
}
beforeEach(() => {
	setMemoAutoSaveOwner("reset");
	setMemoAutoSaveOwner("owner");
});
it("새 후보를 명시 선택하면 보류 입력을 대상 session에 연결한다", () => {
	const source = createSession(null);
	editMemoAutoSaveSession(source, { memo: "unsaved new draft" });
	const target = createSession(42);
	expect(connectMemoPanelDraft({ source, target })).toBe(true);
	expect(target.targetId).toBe(42);
	expect(target.draft.memo).toBe("unsaved new draft");
	expect(target.revision).toBeGreaterThan(target.savedRevision);
	expect(source.active).toBe(false);
});
it("선택 대상에 미저장 입력이 있으면 양쪽 초안을 보존한다", () => {
	const source = createSession(null);
	editMemoAutoSaveSession(source, { memo: "new draft" });
	const target = createSession(42);
	editMemoAutoSaveSession(target, { memo: "existing dirty draft" });
	expect(connectMemoPanelDraft({ source, target })).toBe(false);
	expect(source.draft.memo).toBe("new draft");
	expect(target.draft.memo).toBe("existing dirty draft");
});

it("로컬 문자열 대상에도 명시 선택한 입력을 연결한다", () => {
	const source = createSession(null);
	editMemoAutoSaveSession(source, { memo: "local unsaved draft" });
	const target = createSession("local-42");
	expect(connectMemoPanelDraft({ source, target })).toBe(true);
	expect(target.targetId).toBe("local-42");
	expect(target.draft.memo).toBe("local unsaved draft");
});
it("다른 계정의 대상에는 입력을 전달하지 않는다", () => {
	const source = createSession(null);
	editMemoAutoSaveSession(source, { memo: "private draft" });
	const target = createSession(42);
	target.owner = "other";
	expect(connectMemoPanelDraft({ source, target })).toBe(false);
	expect(source.active).toBe(true);
	expect(target.draft.memo).toBe("existing");
});
