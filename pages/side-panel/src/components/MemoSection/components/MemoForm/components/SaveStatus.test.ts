// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import SaveStatus, { type TSaveStatus } from "./SaveStatus";

vi.mock("@web-memo/shared/utils/extension", () => ({
	I18n: { get: (key: string) => key },
}));

let root: Root;
const render = async (status: TSaveStatus, onRetryClick?: () => void) => {
	await act(async () =>
		root.render(createElement(SaveStatus, { status, onRetryClick })),
	);
};

beforeEach(() => {
	vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
	document.body.innerHTML = "<div id='root'></div>";
	root = createRoot(document.getElementById("root") as HTMLElement);
});

afterEach(async () => {
	await act(async () => root.unmount());
	vi.unstubAllGlobals();
});

it("상태가 없으면 아무것도 보여주지 않는다", async () => {
	await render(null);

	expect(document.getElementById("root")?.textContent).toBe("");
});

it.each([
	["saving", "save_status_saving"],
	["saved", "save_status_saved"],
	["offlineSaved", "save_status_offline_saved"],
	["offline", "save_status_offline"],
	["syncing", "save_status_syncing"],
	["syncFailed", "save_status_sync_failed"],
] as const)("%s 상태면 %s 문구를 보여준다", async (status, expectedKey) => {
	await render(status);

	expect(document.getElementById("root")?.textContent).toContain(expectedKey);
});

it("동기화 실패 상태에서만 다시 시도 버튼을 보여주고 클릭을 전달한다", async () => {
	const onRetryClick = vi.fn();
	await render("syncFailed", onRetryClick);

	const retryButton = document.querySelector("button");
	expect(retryButton).not.toBeNull();
	await act(async () =>
		retryButton?.dispatchEvent(new MouseEvent("click", { bubbles: true })),
	);
	expect(onRetryClick).toHaveBeenCalledTimes(1);
});

it("저장됨 상태에서는 다시 시도 버튼이 없다", async () => {
	await render("saved");

	expect(document.querySelector("button")).toBeNull();
});
