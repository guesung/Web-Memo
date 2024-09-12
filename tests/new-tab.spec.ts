import { expect, test } from './fixtures';

test('New Tab의 title을 체크한다', async ({ page, extensionId }) => {
  await page.goto(`chrome-extension://${extensionId}/new-tab/index.html`);
  await expect(page).toHaveTitle('Web Memo Archive');
});
