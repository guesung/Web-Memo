import { describe, expect, it } from "vitest";
import { decideInventoryPrAction } from "./sync-supabase-inventory-pr.mjs";

describe("decideInventoryPrAction", () => {
	it("문서가 master와 같고 열린 PR이 없으면 아무것도 하지 않는다", () => {
		expect(decideInventoryPrAction({ documentChanged: false, openPrNumber: null, branchDocumentMatches: false })).toBe("noop");
	});

	it("문서가 master와 같아졌는데 열린 PR이 있으면 닫는다", () => {
		expect(decideInventoryPrAction({ documentChanged: false, openPrNumber: 12, branchDocumentMatches: false })).toBe("close");
	});

	it("문서가 달라졌고 열린 PR이 없으면 새로 만든다", () => {
		expect(decideInventoryPrAction({ documentChanged: true, openPrNumber: null, branchDocumentMatches: false })).toBe("create");
	});

	it("열린 PR의 내용과 다르면 브랜치를 갱신한다", () => {
		expect(decideInventoryPrAction({ documentChanged: true, openPrNumber: 12, branchDocumentMatches: false })).toBe("update");
	});

	it("열린 PR이 이미 같은 내용이면 다시 push하지 않는다", () => {
		expect(decideInventoryPrAction({ documentChanged: true, openPrNumber: 12, branchDocumentMatches: true })).toBe("noop");
	});
});
