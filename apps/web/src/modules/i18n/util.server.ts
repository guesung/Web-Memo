import { createInstance, type i18n, type Namespace } from "i18next";
import resourcesToBackend from "i18next-resources-to-backend";
import { initReactI18next } from "react-i18next/initReactI18next";

import type { Language } from "./type";
import { getOptions } from "./util";

const translationCache = new Map<string, i18n>();

const initI18next = async (language: Language, namespace?: Namespace) => {
	if (translationCache.has(language))
		return translationCache.get(language) as i18n;

	const i18nInstance = createInstance();
	await i18nInstance
		.use(initReactI18next)
		.use(
			resourcesToBackend(
				(language: Language) =>
					import(`./locales/${language}/translation.json`),
			),
		)
		.init(getOptions(language, namespace));

	translationCache.set(language, i18nInstance);

	return i18nInstance;
};

interface TranslationOptions {
	keyPrefix?: string;
}

export default async function useTranslation(
	language: Language,
	namespace?: Namespace,
	options?: TranslationOptions,
) {
	const i18nextInstance = await initI18next(language, namespace);

	return {
		t: i18nextInstance.getFixedT(
			language,
			Array.isArray(namespace) ? namespace[0] : namespace,
			options?.keyPrefix,
		),
		i18n: i18nextInstance,
	};
}
