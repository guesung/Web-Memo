import { Page } from '@playwright/test';
import { expect, test } from './fixtures';

test.describe('SidePanel', () => {
  let sidePanelPage: Page;
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.getByRole('button', { name: '테스트 계정으로 로그인' }).click();

    await page.waitForURL(/.*memos/);

    await page.goto('https://blog.toss.im/article/toss-team-culture');

    await page.locator('#open-side-panel').click();

    sidePanelPage = page
      .context()
      .pages()
      .find(page => page.url() === 'chrome-extension://eaiojpmgklfngpjddhoalgcpkepgkclh/side-panel/index.html')!;
  });

  test('메모가 입력된다.', async () => {
    const text = String(new Date());

    sidePanelPage.locator('#memo-textarea').fill(text);

    await expect(sidePanelPage.locator('#memo-textarea')).toHaveText(text);
  });

  test('Command + S를 누르면 메모가 저장된다.', async () => {
    const text = String(new Date());

    await sidePanelPage.locator('#memo-textarea').fill(text);
    await sidePanelPage.locator('#memo-textarea').press('ControlOrMeta+s');

    await sidePanelPage.reload();
    await expect(sidePanelPage.locator('#memo-textarea')).toHaveText(text);

    await sidePanelPage.reload();
    await expect(sidePanelPage.locator('#memo-textarea')).toHaveText(text);

    await sidePanelPage.reload();
    await expect(sidePanelPage.locator('#memo-textarea')).toHaveText(text);
  });
});
