import { expect, it, vi } from "vitest";
import {
	sendTestNotification,
	TEST_NOTIFICATION_BODY,
	TEST_NOTIFICATION_TITLE,
} from "./sendTestNotification";

const mocks = vi.hoisted(() => ({ schedule: vi.fn() }));

vi.mock("expo-notifications", () => ({
	scheduleNotificationAsync: mocks.schedule,
}));

it("url 없는 로컬 알림을 즉시 발송한다", async () => {
	await sendTestNotification();

	expect(mocks.schedule).toHaveBeenCalledWith({
		content: { title: TEST_NOTIFICATION_TITLE, body: TEST_NOTIFICATION_BODY },
		trigger: null,
	});
});
