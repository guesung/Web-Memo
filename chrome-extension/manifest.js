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
    name: '__MSG_extensionName__',
    version: packageJson.version,
    description: '__MSG_extensionDescription__',
    default_locale: 'ko',
    permissions: ['sidePanel', 'storage', 'tabs', 'contextMenus', 'cookies'],
    host_permissions: ['<all_urls>'],
    options_page: 'options/index.html',
    background: {
      service_worker: 'background.iife.js',
      type: 'module',
    },
    externally_connectable: {
      matches: ['http://localhost:3000/*', 'https://*.web-memo.site/*'],
    },
    action: {
      default_popup: 'popup/index.html',
      default_icon: 'icon-34.png',
    },
    icons: {
      16: 'icon-16.png',
      48: 'icon-48.png',
      128: 'icon-128.png',
    },
    content_scripts: [
      {
        matches: ['http://*/*', 'https://*/*', '<all_urls>'],
        js: ['content-ui/index.iife.js'],
      },
      {
        matches: ['http://*/*', 'https://*/*', '<all_urls>'],
        css: ['content.css'], // public folder
      },
    ],
    web_accessible_resources: [
      {
        resources: ['*.js', '*.css', '*.svg', 'icon-128.png', 'icon-34.png', 'icon-16.png', 'icon-48.png'],
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
      client_id: '541718063018-1or10fljnf26bg8jgd028t509k22ejfi.apps.googleusercontent.com',
      scopes: ['openid', 'email', 'profile'],
    },
  },
  !isFirefox && sidePanelConfig,
);

export default manifest;
