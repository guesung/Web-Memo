export class I18n {
  static get(key: string) {
    return chrome.i18n.getMessage(key);
  }
  static getUiLanguage() {
    return chrome.i18n.getUILanguage();
  }
}
