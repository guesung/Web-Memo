// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import SidebarCategoryNameInput from "./SidebarCategoryNameInput";

vi.mock("@web-memo/ui", () => ({
	Input: (props: object) => createElement("input", props),
}));

let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
	vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
	container = document.createElement("div");
	document.body.append(container);
	root = createRoot(container);
});

afterEach(async () => {
	await act(async () => root.unmount());
	container.remove();
	vi.unstubAllGlobals();
});

const renderInput = async ({
	onSubmit,
	onCancel = vi.fn(),
}: {
	onSubmit: (name: string) => Promise<boolean>;
	onCancel?: () => void;
}) => {
	await act(async () => {
		root.render(
			createElement(SidebarCategoryNameInput, {
				name: "기존 이름",
				onSubmit,
				onCancel,
			}),
		);
	});
	const input = container.querySelector("input");
	if (!input) throw new Error("카테고리 이름 입력을 찾지 못했습니다.");
	input.value = "새 이름";
	return input;
};

it("Enter와 blur가 연달아 발생해도 저장을 한 번만 요청한다", async () => {
	let complete!: (value: boolean) => void;
	const onSubmit = vi.fn(
		() =>
			new Promise<boolean>((resolve) => {
				complete = resolve;
			}),
	);
	const input = await renderInput({ onSubmit });

	await act(async () => {
		input.dispatchEvent(
			new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
		);
		input.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
	});
	expect(onSubmit).toHaveBeenCalledOnce();
	expect(onSubmit).toHaveBeenCalledWith("새 이름");
	await act(async () => complete(true));
});

it("Escape 뒤에 blur가 발생해도 저장하지 않는다", async () => {
	const onSubmit = vi.fn(async () => true);
	const onCancel = vi.fn();
	const input = await renderInput({ onSubmit, onCancel });

	await act(async () => {
		input.dispatchEvent(
			new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
		);
		input.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
	});
	expect(onCancel).toHaveBeenCalledOnce();
	expect(onSubmit).not.toHaveBeenCalled();
});

it("저장 요청이 진행 중이면 Escape로 편집을 닫지 않는다", async () => {
	let complete!: (value: boolean) => void;
	const onSubmit = vi.fn(
		() =>
			new Promise<boolean>((resolve) => {
				complete = resolve;
			}),
	);
	const onCancel = vi.fn();
	const input = await renderInput({ onSubmit, onCancel });

	await act(async () => {
		input.dispatchEvent(
			new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
		);
		input.dispatchEvent(
			new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
		);
	});
	expect(onCancel).not.toHaveBeenCalled();
	await act(async () => complete(true));
});

it("한글 조합 중 Enter는 저장하지 않는다", async () => {
	const onSubmit = vi.fn(async () => true);
	const input = await renderInput({ onSubmit });

	await act(async () => {
		input.dispatchEvent(
			new KeyboardEvent("keydown", {
				key: "Enter",
				bubbles: true,
				isComposing: true,
			}),
		);
	});
	expect(onSubmit).not.toHaveBeenCalled();
});

it("저장 실패 후에는 입력값을 유지하고 다시 제출할 수 있다", async () => {
	const onSubmit = vi
		.fn()
		.mockResolvedValueOnce(false)
		.mockResolvedValueOnce(true);
	const input = await renderInput({ onSubmit });

	await act(async () => {
		input.dispatchEvent(
			new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
		);
	});
	expect(input.value).toBe("새 이름");
	await act(async () => {
		input.dispatchEvent(
			new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
		);
	});
	expect(onSubmit).toHaveBeenCalledTimes(2);
});
