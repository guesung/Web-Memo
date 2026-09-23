// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useAutoSaveSetting } from "./useAutoSaveSetting";

/** 테스트에서 관측하는 자동 저장 항목 상태입니다. */
type TSettingState = ReturnType<typeof useAutoSaveSetting<string>>;

vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);

afterEach(() => {
	vi.useRealTimers();
	document.body.innerHTML = "";
});

const renderSetting = async (onSave: (value: string) => Promise<void>) => {
	const container = document.createElement("div");
	document.body.appendChild(container);
	const root = createRoot(container);
	let current: TSettingState;
	const TestSetting = (props: { initialValue: string }) => {
		current = useAutoSaveSetting({ initialValue: props.initialValue, onSave });

		return null;
	};
	const rerender = async (initialValue: string) => {
		await act(async () => {
			root.render(createElement(TestSetting, { initialValue }));
		});
	};
	await rerender("first");

	return {
		get state() {
			return current;
		},
		rerender,
		unmount: async () => {
			await act(async () => {
				root.unmount();
			});
		},
	};
};

describe("useAutoSaveSetting external updates", () => {
	it("adopts a changed server value while idle", async () => {
		const setting = await renderSetting(vi.fn().mockResolvedValue(undefined));
		await setting.rerender("external");
		expect(setting.state.value).toBe("external");
		expect(setting.state.status).toBe("idle");
		await setting.unmount();
	});

	it("keeps the latest local choice during save, then accepts the next external value", async () => {
		let finishSave: (() => void) | undefined;
		const onSave = vi.fn(
			() =>
				new Promise<void>((resolve) => {
					finishSave = resolve;
				}),
		);
		const setting = await renderSetting(onSave);
		await act(async () => {
			setting.state.changeValue("local");
		});
		await setting.rerender("external-during-save");
		expect(setting.state.value).toBe("local");
		expect(setting.state.status).toBe("saving");
		await act(async () => {
			finishSave?.();
		});
		expect(setting.state.value).toBe("local");
		await setting.rerender("external-after-save");
		expect(setting.state.value).toBe("external-after-save");
		expect(setting.state.status).toBe("idle");
		await setting.unmount();
	});

	it("cancels the success timer when an external value arrives", async () => {
		vi.useFakeTimers();
		const setting = await renderSetting(vi.fn().mockResolvedValue(undefined));
		await act(async () => {
			setting.state.changeValue("local");
		});
		expect(setting.state.status).toBe("saved");
		await setting.rerender("external");
		expect(setting.state.value).toBe("external");
		expect(setting.state.status).toBe("idle");
		await act(async () => {
			vi.advanceTimersByTime(2000);
		});
		expect(setting.state.value).toBe("external");
		expect(setting.state.status).toBe("idle");
		await setting.unmount();
	});
});
