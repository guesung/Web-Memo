import { test as setup } from "./fixtures/web";
import { AUTH_STORAGE_STATE_PATH, login } from "./lib";

setup("테스트 계정으로 로그인해 storageState를 저장한다", async ({ page }) => {
	await login(page);
	await page.context().storageState({ path: AUTH_STORAGE_STATE_PATH });
});
