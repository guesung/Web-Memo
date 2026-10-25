// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SaveStatus from "./SaveStatus";

vi.mock("@web-memo/shared/utils/extension", () => ({
	I18n: { get: (key: string) => key },
}));

let root: Root;
const noop = () => {};

const render = async (
	saveStatus: Parameters<typeof SaveStatus>[0]["saveStatus"],
) => {
	await act(async () =>
		root.render(createElement(SaveStatus, { saveStatus, onRetryClick: noop })),
	);
};

const getLiveRegion = () =>
	document.querySelector('[aria-live="polite"]') as HTMLElement;

beforeEach(() => {
	vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
	document.body.innerHTML =
		'<div id="root"></div><textarea id="memo-textarea"></textarea><input id="memo-title-input" />';
	root = createRoot(document.getElementById("root") as HTMLElement);
});
afterEach(async () => {
	await act(async () => root.unmount());
	vi.unstubAllGlobals();
});

describe("SaveStatus 복구 처리", () => {
	it("다시 시도 버튼이 포커스를 가진 상태에서 복구되면 메모 입력창으로 포커스를 옮긴다", async () => {
		await render("failed");
		const retryButton = document.querySelector("button") as HTMLButtonElement;
		await act(async () => retryButton.focus());

		await render("retrying");
		await render("saved");

		expect(document.activeElement?.id).toBe("memo-textarea");
	});

	it("다른 입력칸이 포커스를 가진 채 자동 저장으로 복구되면 포커스를 옮기지 않는다", async () => {
		await render("failed");
		const titleInput = document.getElementById(
			"memo-title-input",
		) as HTMLInputElement;
		await act(async () => titleInput.focus());

		await render("retrying");
		await render("saved");

		expect(document.activeElement?.id).toBe("memo-title-input");
	});

	it("다시 시도 버튼에서 포커스가 빠지면(blur) 이후 복구에서 포커스를 옮기지 않는다", async () => {
		await render("failed");
		const retryButton = document.querySelector("button") as HTMLButtonElement;
		await act(async () => retryButton.focus());
		await act(async () => retryButton.blur());

		await render("retrying");
		await render("saved");

		expect(document.activeElement?.id).not.toBe("memo-textarea");
	});

	it("실패에서 복구되면 sr-only 안내가 한 번 채워지고, 다음 상태 전환에서 다시 비워진다", async () => {
		await render("failed");
		expect(getLiveRegion().textContent).toBe("");

		await render("saved");
		expect(getLiveRegion().textContent).toBe("toast_saved");

		await render("slow");
		expect(getLiveRegion().textContent).toBe("");
	});

	it("실패 없이 정상 저장되는 동안에는 안내 문구가 바뀌지 않는다", async () => {
		await render("empty");
		expect(getLiveRegion().textContent).toBe("");

		await render("saved");
		expect(getLiveRegion().textContent).toBe("");

		await render("slow");
		expect(getLiveRegion().textContent).toBe("");

		await render("saved");
		expect(getLiveRegion().textContent).toBe("");
	});

	it("실패→복구를 두 번 반복해도 매번 안내 문구가 다시 채워진다", async () => {
		await render("failed");
		await render("saved");
		expect(getLiveRegion().textContent).toBe("toast_saved");

		await render("failed");
		expect(getLiveRegion().textContent).toBe("");

		await render("saved");
		expect(getLiveRegion().textContent).toBe("toast_saved");
	});

	it("SaveStatus 안에는 복구 안내 live region 외에 다른 aria-live나 role=status를 두지 않는다", async () => {
		await render("failed");
		expect(document.querySelectorAll("[aria-live]")).toHaveLength(1);
		expect(document.querySelectorAll('[role="status"]')).toHaveLength(0);
	});
});

describe("오프라인·동기화 상태 표시", () => {
	it.each([
		["offline", "save_status_offline_saved"],
		["offlineIdle", "save_status_offline"],
		["syncing", "save_status_syncing"],
		["syncFailed", "save_status_sync_failed"],
	] as const)(
		"%s 상태면 %s 문구를 보여준다",
		async (saveStatus, expectedKey) => {
			await render(saveStatus);

			expect(document.getElementById("root")?.textContent).toContain(
				expectedKey,
			);
		},
	);

	it("syncFailed 상태에서만 다시 시도 버튼을 보여주고 onSyncRetryClick을 호출한다", async () => {
		const onSyncRetryClick = vi.fn();
		await act(async () =>
			root.render(
				createElement(SaveStatus, {
					saveStatus: "syncFailed",
					onRetryClick: noop,
					onSyncRetryClick,
				}),
			),
		);

		const retryButton = document.querySelector("button");
		expect(retryButton).not.toBeNull();
		await act(async () =>
			retryButton?.dispatchEvent(new MouseEvent("click", { bubbles: true })),
		);
		expect(onSyncRetryClick).toHaveBeenCalledTimes(1);
	});

	it("offline·syncing 상태에서는 다시 시도 버튼이 없다", async () => {
		await render("offline");
		expect(document.querySelector("button")).toBeNull();

		await render("syncing");
		expect(document.querySelector("button")).toBeNull();
	});

	it("대기열이 풀려(offline) 저장됨으로 돌아오면 복구 안내를 읽는다", async () => {
		await render("offline");
		expect(getLiveRegion().textContent).toBe("");

		await render("saved");
		expect(getLiveRegion().textContent).toBe("toast_saved");
	});

	it("동기화 실패(syncFailed)에서 저장됨으로 돌아오면 복구 안내를 읽는다", async () => {
		await render("syncFailed");
		expect(getLiveRegion().textContent).toBe("");

		await render("saved");
		expect(getLiveRegion().textContent).toBe("toast_saved");
	});
});
