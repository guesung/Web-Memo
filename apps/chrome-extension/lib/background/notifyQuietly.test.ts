import { describe, expect, it, vi } from "vitest";
import { notifyQuietly } from "./notifyQuietly";

describe("notifyQuietly", () => {
	it("send가 resolve하면 send를 호출하고 resolve한다", async () => {
		const send = vi.fn().mockResolvedValue("ok");
		await expect(notifyQuietly(send)).resolves.toBeUndefined();
		expect(send).toHaveBeenCalledTimes(1);
	});

	it("send가 reject해도 resolve한다", async () => {
		const send = vi.fn().mockRejectedValue(new Error("closed"));
		await expect(notifyQuietly(send)).resolves.toBeUndefined();
	});

	it("send가 동기 throw해도 resolve한다", async () => {
		const send = vi.fn(() => {
			throw new Error("sync");
		});
		await expect(notifyQuietly(send)).resolves.toBeUndefined();
	});
});
