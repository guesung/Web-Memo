import { expect, test } from './fixtures';

test.describe('페이지를 이동하고 사이드 패널을 연다', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('https://blog.toss.im/article/toss-team-culture');
    await page.locator('#open-side-panel').click();
  });

  test('사이드 패널이 열렸다', async ({ page }) => {
    const sidePanelPage = await page
      .context()
      .pages()
      .find(it => it.url() === 'chrome-extension://eaiojpmgklfngpjddhoalgcpkepgkclh/side-panel/index.html');
    await expect(sidePanelPage).toBeDefined();
  });
});
