import { describe, expect, it } from "vitest";
import {
	type IFMemoPanelDraft,
	retainPostSaveEdits,
	selectMemoCandidate,
} from "./memoDraft";

describe("retainPostSaveEdits", () => {
	it("저장 중 추가 입력을 별도 저장 결과의 새 ID에 연결한다", () => {
		const drafts = new Map<string, IFMemoPanelDraft>();
		const retained = retainPostSaveEdits({
			savedRevision: 1,
			currentRevision: 2,
			latestDraft: {
				title: "제목",
				memo: "저장 요청 후 더 쓴 내용",
				impression: "",
				actionItem: "",
				pendingLocalId: "local-1",
				pendingSaveMode: "separate",
			},
			selectionKey: "local-1",
			nextMemoId: 42,
			drafts,
		});

		expect(retained).toBe(true);
		expect(drafts.get("42")).toMatchObject({
			memo: "저장 요청 후 더 쓴 내용",
			pendingLocalId: null,
			pendingSaveMode: null,
		});
	});

	it("추가 입력이 없으면 저장된 값을 초안으로 다시 남기지 않는다", () => {
		const drafts = new Map<string, IFMemoPanelDraft>();
		const retained = retainPostSaveEdits({
			savedRevision: 1,
			currentRevision: 1,
			latestDraft: {
				title: "제목",
				memo: "저장한 내용",
				impression: "",
				actionItem: "",
				pendingLocalId: null,
				pendingSaveMode: null,
			},
			selectionKey: "1",
			drafts,
		});

		expect(retained).toBe(false);
		expect(drafts.size).toBe(0);
	});
});

describe("selectMemoCandidate", () => {
	it("로컬 초안에서 원격 메모로 전환할 때 원본 ID를 넘기지 않는다", () => {
		const drafts = new Map<string, IFMemoPanelDraft>();
		const pendingIds: Array<string | null> = [];
		const selectedIds: Array<number | string | null> = [];
		selectMemoCandidate({
			id: 42,
			isPending: false,
			hasDraft: true,
			drafts,
			selectionKey: "local-1",
			latestDraft: {
				title: "로컬 제목",
				memo: "로컬 내용",
				impression: "",
				actionItem: "",
				pendingLocalId: "local-1",
				pendingSaveMode: "separate",
			},
			isLoggedIn: true,
			setPendingLocalId: (id) => pendingIds.push(id),
			setPendingSaveMode: () => {},
			onSelectedMemoIdChange: (id) => selectedIds.push(id),
		});
		expect(drafts.get("local-1")?.pendingLocalId).toBe("local-1");
		expect(pendingIds).toEqual([null]);
		expect(selectedIds).toEqual([42]);
	});
});
