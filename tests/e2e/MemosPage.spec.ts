import { expect, test } from './fixtures';

test.describe('Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.getByRole('button', { name: '테스트 계정으로 로그인' }).click();
    await page.waitForURL(/.*memos/);
  });

  test.describe('가이드 기능', () => {
    test('메모 페이지 최초 접속시, 가이드를 볼 수 있다.', async ({ page }) => {
      expect(page.locator('#driver-popover-description')).toHaveText(
        '메모를 한 번 해볼까요?\nOption + S를 눌러 사이드 패널을 열어보세요 !',
      );
    });
    test('사이드 패널을 열 시, 다음 가이드 페이지로 이동한다.', async ({ page, baseURL }) => {
      await page.goto('https://blog.toss.im/article/toss-team-culture');
      await page.locator('#open-side-panel').click();
      await page.goto(baseURL!);

      await page.waitForTimeout(1000);

      expect(page.locator('#driver-popover-description')).toContainText(
        '이제 이 사이드 패널에서 메모를 기록하실 수 있답니다.',
      );
    });
    test('새로고침 버튼을 누르면, 가이드가 종료된다.', async ({ page }) => {
      await page.locator('.driver-popover-next-btn').click();
      await page.locator('.driver-popover-next-btn').click();
      await page.locator('#refresh').click();

      expect(page.locator('#driver-popover')).toBeHidden();
    });
  });

  test.describe('메모 확인 기능', () => {
    test.beforeEach(async ({ page, baseURL }) => {
      await page.goto('https://blog.toss.im/article/toss-team-culture');
      await page.locator('#open-side-panel').click();

      await page.goto(baseURL!);
    });
    test('사이드 패널에서 메모를 저장하면 메모를 확인할 수 있다.', async ({ page, sidePanelPage }) => {
      const text = String(new Date());
      await sidePanelPage.locator('#memo-textarea').fill(text);
      await sidePanelPage.locator('#memo-textarea').press('ControlOrMeta+s');

      await page.reload();
      expect(page.getByText(text)).toBeVisible();
    });
  });
});
