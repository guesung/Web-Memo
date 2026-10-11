import { expect, test } from "../fixtures/extension";

test("확장 client ID와 버전으로 제거 API에 요청하면 설문 페이지로 이동한다", async ({
	context,
}) => {
	const background = context.serviceWorkers()[0];
	const extensionInfo = await background.evaluate(async () => {
		const { clientId } = await chrome.storage.local.get("clientId");
		return { clientId, version: chrome.runtime.getManifest().version };
	});

	expect(extensionInfo.clientId).toMatch(/^[0-9a-f-]{36}$/i);
	expect(extensionInfo.version).toMatch(/^\d+(?:\.\d+){1,3}$/);

	const uninstallUrl = new URL("/api/uninstall", "http://localhost:3000");
	uninstallUrl.searchParams.set("cid", extensionInfo.clientId);
	uninstallUrl.searchParams.set("v", extensionInfo.version);
	const response = await context.request.get(uninstallUrl.toString(), {
		maxRedirects: 0,
	});

	expect(response.status()).toBe(302);
	expect(new URL(response.headers().location).pathname).toBe("/uninstall");
	expect(new URL(response.headers().location).search).toBe("");
	expect(response.headers()["cache-control"]).toBe("no-store");
});
