import { expect, test } from './fixtures';

test.describe('SidePanel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.getByRole('button', { name: '테스트 계정으로 로그인' }).click();

    await page.waitForURL(/.*memos/);

    await page.goto('chrome-extension://eaiojpmgklfngpjddhoalgcpkepgkclh/side-panel/index.html');
  });
  test.describe('메모 기능', () => {
    test('사이드 패널에 메모가 보인다.', async ({ page }) => {
      await expect(page.locator('#memo-textarea')).toBeVisible();
    });
    test('메모가 입력된다.', async ({ page }) => {
      const text = String(new Date());

      await page.locator('#memo-textarea').fill(text);

      await expect(page.locator('#memo-textarea')).toHaveText(text);
    });
    test('Command + S를 누르면 메모가 저장된다.', async ({ page }) => {
      const text = String(new Date());

      await page.locator('#memo-textarea').fill(text);
      await page.locator('#memo-textarea').press('ControlOrMeta+s');

      await page.reload();
      await expect(page.locator('#memo-textarea')).toHaveText(text);

      await page.reload();
      await expect(page.locator('#memo-textarea')).toHaveText(text);

      await page.reload();
      await expect(page.locator('#memo-textarea')).toHaveText(text);
    });
  });
});
