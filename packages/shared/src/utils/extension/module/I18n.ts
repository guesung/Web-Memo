export class I18n {
	/**
	 * 확장 _locales 문구를 읽는다.
	 * @description substitutions는 messages.json placeholders의 $1, $2…에 순서대로 들어간다.
	 */
	static get(key: string, substitutions?: string | string[]) {
		return chrome.i18n.getMessage(key, substitutions);
	}
	static getUILanguage() {
		return chrome.i18n.getUILanguage();
	}
}
