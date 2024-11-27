'use client';

import { useEffect, useState } from 'react';
import i18next from 'i18next';
import { initReactI18next, UseTranslationOptions, useTranslation as useTranslationOrg } from 'react-i18next';
import { useCookies } from 'react-cookie';
import resourcesToBackend from 'i18next-resources-to-backend';
import LanguageDetector from 'i18next-browser-languagedetector';
import { languages, cookieName } from './constant';
import { getOptions } from './util';
import { isProduction } from '@extension/shared/utils';
import { Language } from './type';

const runsOnServerSide = typeof window === 'undefined';

i18next
  .use(initReactI18next)
  .use(LanguageDetector)
  .use(resourcesToBackend((language: Language, namespace: string) => import(`./locales/${language}/${namespace}.json`)))
  .init({
    ...getOptions(),
    lng: undefined,
    detection: {
      order: ['path', 'htmlTag', 'cookie', 'navigator'],
    },
    preload: runsOnServerSide ? languages : [],
  });

export default function useTranslation(language: Language, ns: string, options: UseTranslationOptions<string>) {
  const [cookies, setCookie] = useCookies([cookieName]);
  const ret = useTranslationOrg(ns, options);
  const { i18n } = ret;

  const [activeLng, setActiveLng] = useState(i18n.resolvedLanguage);

  if (runsOnServerSide && language && i18n.resolvedLanguage !== language) {
    i18n.changeLanguage(language);
    return ret;
  }

  useEffect(() => {
    setActiveLng(i18n.resolvedLanguage);
  }, [activeLng]);

  useEffect(() => {
    if (!language || i18n.resolvedLanguage === language) return;
    i18n.changeLanguage(language);
  }, [language, i18n]);

  useEffect(() => {
    if (cookies.i18next === language) return;
    setCookie(cookieName, language, {
      path: '/',
      maxAge: 365 * 24 * 60 * 60,
      secure: isProduction,
      sameSite: 'strict',
    });
  }, [language, cookies.i18next]);

  return ret;
}
