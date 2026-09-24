export class I18n {
	static get(key: string, substitutions?: string | string[]) {
		return chrome.i18n.getMessage(key, substitutions);
	}
	static getUILanguage() {
		return chrome.i18n.getUILanguage();
	}
}
