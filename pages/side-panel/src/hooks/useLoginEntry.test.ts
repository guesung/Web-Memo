import { analytics } from "@web-memo/shared/modules/analytics";
import { Tab } from "@web-memo/shared/utils/extension";
import { beforeEach, expect, it, vi } from "vitest";
import useLoginEntry from "./useLoginEntry";

vi.mock("@web-memo/env", () => ({ CONFIG: { webUrl: "https://example.com" } }));
vi.mock("@web-memo/shared/modules/analytics", () => ({
	analytics: { trackEvent: vi.fn(), getExtensionClientId: vi.fn() },
}));
vi.mock("@web-memo/shared/utils/extension", () => ({
	Tab: { create: vi.fn() },
}));

const openLogin = () => useLoginEntry().openLogin();

beforeEach(() => {
	vi.clearAllMocks();
});

it("로그인 화면을 새 탭으로 열고 확장의 client_id를 ext_cid로 싣는다", async () => {
	vi.mocked(analytics.getExtensionClientId).mockResolvedValue("cid-1");

	await openLogin();

	expect(Tab.create).toHaveBeenCalledWith({
		url: "https://example.com/login?ext_cid=cid-1",
	});
});

it("client_id를 알 수 없으면 ext_cid 없이 연다", async () => {
	vi.mocked(analytics.getExtensionClientId).mockResolvedValue(undefined);

	await openLogin();

	expect(Tab.create).toHaveBeenCalledWith({
		url: "https://example.com/login",
	});
});

it("탭을 열기 전에 side_panel_login_click을 기록한다", async () => {
	vi.mocked(analytics.getExtensionClientId).mockResolvedValue("cid-1");

	await openLogin();

	expect(analytics.trackEvent).toHaveBeenCalledWith({
		name: "side_panel_login_click",
		params: {},
	});
	expect(
		vi.mocked(analytics.trackEvent).mock.invocationCallOrder[0],
	).toBeLessThan(vi.mocked(Tab.create).mock.invocationCallOrder[0]);
});
