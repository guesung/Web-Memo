import { createInstance, type Namespace } from 'i18next';
import resourcesToBackend from 'i18next-resources-to-backend';
import { initReactI18next } from 'react-i18next/initReactI18next';

import type { Language } from './type';
import { getOptions } from './util';

const initI18next = async (language: Language, ns?: Namespace) => {
  const i18nInstance = createInstance();
  await i18nInstance
    .use(initReactI18next)
    .use(
      resourcesToBackend(
        (language: Language, namespace: Namespace) => import(`./locales/${language}/${namespace}.json`),
      ),
    )
    .init(getOptions(language, ns));
  return i18nInstance;
};

interface TranslationOptions {
  keyPrefix?: string;
}

export default async function useTranslation(language: Language, ns?: Namespace, options?: TranslationOptions) {
  const i18nextInstance = await initI18next(language, ns);

  return {
    t: i18nextInstance.getFixedT(language, Array.isArray(ns) ? ns[0] : ns, options?.keyPrefix),
    i18n: i18nextInstance,
  };
}
