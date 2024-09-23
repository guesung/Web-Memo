import { expect, test } from './fixtures';

test('Memo Tabe의 title을 체크한다', async ({ page }) => {
  await page.goto('http://localhost:3000/memo');
  await expect(page).toHaveTitle('Web Memo');
});

const COLUMN_NAME_LIST = ['번호', '제목', '날짜', '메모', '삭제'];

test('Memo Tabe의 columns를 체크한다', async ({ page }) => {
  await page.goto('http://localhost:3000/memo');

  for (const columnName of COLUMN_NAME_LIST) {
    const column = await page.getByText(columnName);
    await expect(column).toBeDefined();
  }
});
