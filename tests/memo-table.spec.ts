import { expect, test } from './fixtures';

test.describe('메모 테이블을 테스트한다', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/memo');
  });
  test('title을 체크한다', async ({ page }) => {
    await expect(page).toHaveTitle('Web Memo');
  });
  test('비었을 때를 체크한다.', async ({ page }) => {
    const emptyElem = page.getByText('No Memo');
    expect(emptyElem).toBeVisible();
  });
});

const COLUMN_NAME_LIST = ['번호', '제목', '날짜', '메모', '삭제'];

test('Memo Tabe의 columns를 체크한다', async ({ page }) => {
  await page.goto('http://localhost:3000/memo');

  for await (const columnName of COLUMN_NAME_LIST) {
    const column = page.getByText(columnName, { exact: true });
    expect(column).toBeVisible();
  }
});
