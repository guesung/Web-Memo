// @vitest-environment jsdom

import { act, createElement, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import SidebarCategorySection from "./SidebarCategorySection";

const mocks = vi.hoisted(() => ({
	categories: [
		{ id: 1, name: "첫 카테고리", color: null, memo_count: 0 },
		{ id: 2, name: "둘째 카테고리", color: null, memo_count: 0 },
	],
	newName: "변경한 이름",
	update: vi.fn(),
	toast: vi.fn(),
}));

vi.mock("@src/modules/i18n/util.client", () => ({
	default: () => ({ t: (key: string) => key }),
}));
vi.mock("@src/components/LocalizedLink", () => ({
	default: ({ children }: { children: ReactNode }) =>
		createElement("a", null, children),
}));
vi.mock("@web-memo/shared/hooks", () => ({
	useCategoryQuery: () => ({ categories: mocks.categories }),
	useCategoryUpdateMutation: () => ({ mutateAsync: mocks.update }),
}));
vi.mock("@web-memo/shared/modules/search-params", () => ({
	useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@web-memo/ui", () => ({
	SidebarGroup: ({ children }: { children: ReactNode }) =>
		createElement("div", null, children),
	SidebarGroupContent: ({ children }: { children: ReactNode }) =>
		createElement("div", null, children),
	SidebarGroupLabel: ({ children }: { children: ReactNode }) =>
		createElement("div", null, children),
	SidebarMenu: ({ children }: { children: ReactNode }) =>
		createElement("div", null, children),
	toast: mocks.toast,
}));
vi.mock("./SidebarMenuItemAddCategory", () => ({ default: () => null }));
vi.mock("./SidebarCategoryItem", () => ({
	default: ({
		category,
		isEditing,
		onStartEditing,
		onSubmit,
		onCancel,
	}: {
		category: { id: number };
		isEditing: boolean;
		onStartEditing: () => void;
		onSubmit: (name: string) => Promise<boolean>;
		onCancel: () => void;
	}) =>
		createElement(
			"div",
			{ "data-category-id": category.id, "data-editing": isEditing },
			createElement(
				"button",
				{ type: "button", onClick: onStartEditing },
				"edit",
			),
			createElement(
				"button",
				{ type: "button", onClick: () => void onSubmit(mocks.newName) },
				"submit",
			),
			createElement("button", { type: "button", onClick: onCancel }, "cancel"),
		),
}));

let root: Root;
let container: HTMLDivElement;

beforeEach(async () => {
	vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
	container = document.createElement("div");
	document.body.append(container);
	root = createRoot(container);
	mocks.newName = "변경한 이름";
	mocks.update.mockReset();
	mocks.toast.mockReset();
	await act(async () =>
		root.render(createElement(SidebarCategorySection, { lng: "ko" })),
	);
});

afterEach(async () => {
	await act(async () => root.unmount());
	container.remove();
	vi.unstubAllGlobals();
});

const getCategory = (id: number) => {
	const item = container.querySelector(`[data-category-id="${id}"]`);
	if (!item) throw new Error(`카테고리 ${id}를 찾지 못했습니다.`);
	return item;
};

const clickAction = async (id: number, label: string) => {
	const button = Array.from(getCategory(id).querySelectorAll("button")).find(
		(candidate) => candidate.textContent === label,
	);
	if (!button) throw new Error(`${id}: ${label} 단추를 찾지 못했습니다.`);
	await act(async () => button.click());
};

it("편집은 한 카테고리에서만 열리고 Escape 취소는 저장하지 않는다", async () => {
	await clickAction(1, "edit");
	expect(getCategory(1).getAttribute("data-editing")).toBe("true");
	await clickAction(2, "edit");
	expect(getCategory(1).getAttribute("data-editing")).toBe("false");
	expect(getCategory(2).getAttribute("data-editing")).toBe("true");
	await clickAction(2, "cancel");
	expect(getCategory(2).getAttribute("data-editing")).toBe("false");
	expect(mocks.update).not.toHaveBeenCalled();
});

it("Supabase 결과에 error가 있으면 편집을 유지하고 재시도한다", async () => {
	mocks.update
		.mockResolvedValueOnce({ error: { message: "실패" } })
		.mockResolvedValueOnce({ error: null });
	await clickAction(1, "edit");
	await clickAction(1, "submit");
	expect(getCategory(1).getAttribute("data-editing")).toBe("true");
	expect(mocks.toast).toHaveBeenCalledWith({ title: "toastTitle.errorSave" });
	await clickAction(1, "submit");
	expect(mocks.update).toHaveBeenCalledTimes(2);
	expect(getCategory(1).getAttribute("data-editing")).toBe("false");
});

it("늦게 끝난 A 저장은 새로 편집 중인 B를 닫지 않는다", async () => {
	let complete!: (value: { error: null }) => void;
	mocks.update.mockReturnValueOnce(
		new Promise((resolve) => {
			complete = resolve;
		}),
	);
	await clickAction(1, "edit");
	await clickAction(1, "submit");
	await clickAction(2, "edit");
	await act(async () => complete({ error: null }));
	expect(getCategory(2).getAttribute("data-editing")).toBe("true");
});

it("중복 이름은 저장하지 않고 기존 정책대로 편집을 종료한다", async () => {
	mocks.newName = "둘째 카테고리";
	await clickAction(1, "edit");
	await clickAction(1, "submit");
	expect(mocks.update).not.toHaveBeenCalled();
	expect(mocks.toast).toHaveBeenCalledWith({
		title: "toastTitle.duplicateCategory",
	});
	expect(getCategory(1).getAttribute("data-editing")).toBe("false");
});
