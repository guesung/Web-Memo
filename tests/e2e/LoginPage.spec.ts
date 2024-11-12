import { expect, test } from './fixtures';

test.describe('Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
  });
  test.describe('로그인', () => {
    test('로그인을 하지 않고 접속할 경우, login페이지로 redirect된다.', async ({ page }) => {
      expect(page).toHaveURL(/.*login/);
    });
    test('카카오 로그인 버튼을 클릭하면 카카오 로그인 페이지로 이동한다.', async ({ page }) => {
      page.getByRole('button', { name: 'kakao 카카오 로그인' }).click();

      expect(page).toHaveURL(/https:\/\/accounts.kakao.com*/);
    });
    test('구글 로그인 버튼을 클릭하면 구글 로그인 페이지로 이동한다.', async ({ page }) => {
      await page.getByRole('button', { name: 'google 구글 로그인' }).click();

      expect(page).toHaveURL(/https:\/\/accounts.google.com\/v3\/signin*/);
    });
    test('테스트 계정으로 로그인 시, memos페이지로 이동한다.', async ({ page }) => {
      await page.getByRole('button', { name: '테스트 계정으로 로그인' }).click();

      expect(page).toHaveURL(/.*memos/);
    });
  });
});
