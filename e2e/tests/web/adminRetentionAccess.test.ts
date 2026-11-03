import { expect, test } from "../fixtures/web";

// 관리자 서버 레이아웃의 인증 경계를 확인한다. 로그인 세션 없이 RPC를 호출하지 않는다.
test.use({ storageState: { cookies: [], origins: [] } });

test("로그인하지 않은 사용자는 리텐션 관리자 화면에 접근할 수 없다", async ({
	page,
}) => {
	await page.goto("/ko/admin");
	await expect(page).toHaveURL(/\/ko\/login(?:\?|$)/);
	await expect(page.getByText("메모 작성 리텐션")).toHaveCount(0);
});
