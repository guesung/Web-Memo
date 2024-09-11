import fs from 'node:fs';
import deepmerge from 'deepmerge';

const packageJson = JSON.parse(fs.readFileSync('../package.json', 'utf8'));

const isFirefox = process.env.__FIREFOX__ === 'true';

const sidePanelConfig = {
  side_panel: {
    default_path: 'side-panel/index.html',
  },
};

/**
 * After changing, please reload the extension at `chrome://extensions`
 * @type {chrome.runtime.ManifestV3}
 */
const manifest = deepmerge(
  {
    manifest_version: 3,
    /**
     * if you want to support multiple languages, you can use the following reference
     * https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Internationalization
     */
    name: 'Web Memo',
    default_locale: 'en',
    version: packageJson.version,
    permissions: ['sidePanel', 'storage', 'tabs'],
    host_permissions: ['<all_urls>'],
    options_page: 'options/index.html',
    background: {
      service_worker: 'background.iife.js',
      type: 'module',
    },
    action: {
      default_popup: 'popup/index.html',
      default_icon: 'icon-34.png',
    },
    chrome_url_overrides: {
      newtab: 'new-tab/index.html',
    },
    icons: {
      128: 'icon-128.png',
    },
    content_scripts: [
      {
        matches: ['http://*/*', 'https://*/*', '<all_urls>'],
        js: ['content/index.iife.js'],
      },
      {
        matches: ['http://*/*', 'https://*/*', '<all_urls>'],
        js: ['content-ui/index.iife.js'],
      },
      {
        matches: ['http://*/*', 'https://*/*', '<all_urls>'],
        css: ['content.css'], // public folder
      },
    ],
    devtools_page: 'devtools/index.html',
    web_accessible_resources: [
      {
        resources: ['*.js', '*.css', '*.svg', 'icon-128.png', 'icon-34.png'],
        matches: ['*://*/*'],
      },
    ],
    commands: {
      _execute_action: {
        suggested_key: 'Alt+S',
      },
    },
    key: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAob5nrfpKAihURRka74OiALrnMN9aHytr7Ik7vGzbtoVrc6xecQYj+fw1qHfax0gwQi4bql0/Ah3Zb2u7zPmPPvoPStgittQUgg5IVxJIij1cIbRgY+MvQh3z3YU27lA4zANOauhb7Q8Z9ocDr9OoZqX0rBMk9zXSk/UlgDZhRkMuyG8R1DSVUe0qFSIwKFQFMDWp1VmgMR8p9htrhGoOE8kIPxUxKHiVOHw2Dd+u5jASk462HcS7OptLpfAIZsgk/enj0LumPzjANu062ZUBbTUHUzWUL9540UTI6slfuvcjwRKLAtOpg8FN3yaNvCZKOO5Ot9Qy23zZ4LoItHt+TwIDAQAB',
    oauth2: {
      client_id: '541718063018-a1lnta8dlg6ovqse6kgii4kblvbqd4lo.apps.googleusercontent.com',
      scopes: ['https://www.googleapis.com/auth/contacts.readonly'],
    },
  },
  !isFirefox && sidePanelConfig,
);

export default manifest;
