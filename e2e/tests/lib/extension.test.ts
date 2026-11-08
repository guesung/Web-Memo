import type { Page } from "@playwright/test";
import { describe, expect, it, vi } from "vitest";

vi.mock("@web-memo/shared/constants", () => ({
	getExtensionUrl: () => "chrome-extension://test/side-panel/index.html",
}));

import { skipGuide } from "./extension";

const makePage = (isVisible: () => Promise<boolean>) => {
	const waitFor = vi.fn().mockResolvedValue(undefined);
	const locator = vi.fn().mockReturnValue({ isVisible, waitFor });
	const page = {
		evaluate: vi.fn().mockResolvedValue(undefined),
		locator,
		reload: vi.fn().mockResolvedValue(undefined),
	};
	return { page, locator, waitFor };
};

describe("skipGuide", () => {
	it("returns immediately when no guide is visible", async () => {
		const { page, waitFor } = makePage(vi.fn().mockResolvedValue(false));
		await skipGuide(page as unknown as Page);
		expect(page.evaluate).toHaveBeenCalledOnce();
		expect(page.reload).not.toHaveBeenCalled();
		expect(waitFor).not.toHaveBeenCalled();
	});

	it("reloads and waits until an already visible guide is hidden", async () => {
		const { page, waitFor } = makePage(vi.fn().mockResolvedValue(true));
		await skipGuide(page as unknown as Page);
		expect(page.reload).toHaveBeenCalledOnce();
		expect(waitFor).toHaveBeenCalledWith({ state: "hidden", timeout: 5000 });
	});

	it("propagates unexpected visibility errors", async () => {
		const error = new Error("page closed");
		const { page } = makePage(vi.fn().mockRejectedValue(error));
		await expect(skipGuide(page as unknown as Page)).rejects.toBe(error);
		expect(page.reload).not.toHaveBeenCalled();
	});
});
