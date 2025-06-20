export class I18n {
	static get(key: string) {
		return chrome.i18n.getMessage(key);
	}
	static getUILanguage() {
		return chrome.i18n.getUILanguage();
	}
}
