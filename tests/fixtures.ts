import { test as base, chromium, type BrowserContext } from '@playwright/test';
import path from 'path';

process.env.PW_CHROMIUM_ATTACH_TO_OTHER = '1';

const pathToExtension = path.join(path.resolve(), 'dist');

export const test = base.extend<{
  context: BrowserContext;
  extensionId: string;
}>({
  // eslint-disable-next-line no-empty-pattern
  context: async ({}, use) => {
    const context = await chromium.launchPersistentContext('', {
      headless: false,
      args: [`--headless=new`, `--disable-extensions-except=${pathToExtension}`, `--load-extension=${pathToExtension}`],
    });
    await use(context);
    await context.close();
  },
  extensionId: async ({}, use) => {
    await use('eaiojpmgklfngpjddhoalgcpkepgkclh');
  },
});
export const expect = test.expect;
