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
	/**
	 * `get`이 실제로 문구를 고르는 로캘을 Intl용 BCP 47 태그로 돌려준다. 예: `ko`, `en-US`
	 * @description `getUILanguage`는 문구가 고른 로캘과 다를 수 있어, 문구에 끼우는 날짜 포맷은 이 값을 쓴다.
	 */
	static getMessageLocale() {
		return chrome.i18n.getMessage("@@ui_locale").replace("_", "-");
	}
}
