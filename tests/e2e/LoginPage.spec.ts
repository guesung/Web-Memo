import { expect, test } from './fixtures';

test.describe('Login Page', () => {
  test.describe('로그인', () => {
    test('로그인을 하지 않고 접속할 경우, login페이지로 redirect된다.', async ({ page }) => {
      await page.goto('http://localhost:3000');
      expect(page).toHaveURL(/.*login/);
    });
    test('카카오 로그인 버튼을 클릭하면 카카오 로그인 페이지로 이동한다.', async ({ page }) => {
      await page.goto('http://localhost:3000/login');
      const kakaoLoginButton = page.getByText('카카오 로그인');
      await kakaoLoginButton.click();
      expect(page).toHaveURL(/https:\/\/accounts.kakao.com*/);
    });
    test('구글 로그인 버튼을 클릭하면 구글 로그인 페이지로 이동한다.', async ({ page }) => {
      await page.goto('http://localhost:3000/login');
      const googleLoginButton = page.getByText('구글 로그인');
      await googleLoginButton.click();
      expect(page).toHaveURL(/https:\/\/accounts.google.com\/v3\/signin*/);
    });
  });
});
