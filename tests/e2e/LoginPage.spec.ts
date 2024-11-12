import { expect, test } from './fixtures';

const REGEXR = {
  page: {
    login: /.*login/,
    kakaoLogin: /https:\/\/accounts.kakao.com*/,
    googleLogin: /https:\/\/accounts.google.com\/v3\/signin*/,
    memos: /.*memos/,
  },
};

test.describe('Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
  });
  test.describe('로그인', () => {
    test('로그인을 하지 않고 접속할 경우, login페이지로 redirect된다.', async ({ page }) => {
      expect(page).toHaveURL(REGEXR.page.login);
    });
    test('카카오 로그인 버튼을 클릭하면 카카오 로그인 페이지로 이동한다.', async ({ page }) => {
      await page.getByRole('button', { name: 'kakao 카카오 로그인' }).click();

      await page.waitForURL(REGEXR.page.kakaoLogin);

      expect(page).toHaveURL(REGEXR.page.kakaoLogin);
    });
    test('구글 로그인 버튼을 클릭하면 구글 로그인 페이지로 이동한다.', async ({ page }) => {
      await page.getByRole('button', { name: 'google 구글 로그인' }).click();

      await page.waitForURL(REGEXR.page.googleLogin);

      expect(page).toHaveURL(REGEXR.page.googleLogin);
    });
    test('테스트 계정으로 로그인 시, memos페이지로 이동한다.', async ({ page }) => {
      await page.getByRole('button', { name: '테스트 계정으로 로그인' }).click();

      await page.waitForURL(REGEXR.page.memos);

      expect(page).toHaveURL(REGEXR.page.memos);
    });
  });
});
