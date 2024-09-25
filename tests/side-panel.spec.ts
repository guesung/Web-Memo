import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

const getSidePanelPage = (page: Page) => {
  return page
    .context()
    .pages()
    .find(it => it.url() === 'chrome-extension://eaiojpmgklfngpjddhoalgcpkepgkclh/side-panel/index.html');
};

test.describe('사이드 패널을 테스트한다', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('https://blog.toss.im/article/toss-team-culture');
    const $openSidePanelButton = page.locator('#open-side-panel');
    await $openSidePanelButton.click();
  });

  test('사이드 패널이 잘 열린다', async ({ page }) => {
    const sidePanelPage = getSidePanelPage(page);
    expect(sidePanelPage).toBeDefined();
  });

  test('메모에 입력이 잘 된다', async ({ page }) => {
    const sidePanelPage = getSidePanelPage(page)!;

    const $testArea = sidePanelPage.locator('#memos');

    await expect($testArea).toBeVisible();

    $testArea.fill('안녕하세요');
    await expect($testArea).toHaveValue('안녕하세요');
  });
});
