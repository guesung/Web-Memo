'use client';

import i18next, { type Namespace } from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import resourcesToBackend from 'i18next-resources-to-backend';
import { useEffect, useState } from 'react';
import { useCookies } from 'react-cookie';
import { initReactI18next, useTranslation as useTranslationOrg, type UseTranslationOptions } from 'react-i18next';

import { cookieName, languages } from './constant';
import { Language } from './type';
import { getOptions } from './util';

const runsOnServerSide = typeof window === 'undefined';

// eslint-disable-next-line import/no-named-as-default-member
i18next
  .use(initReactI18next)
  .use(LanguageDetector)
  .use(
    resourcesToBackend((language: Language, namespace: Namespace) => import(`./locales/${language}/${namespace}.json`)),
  )
  .init({
    ...getOptions(),
    lng: undefined,
    detection: {
      order: ['path', 'htmlTag', 'cookie', 'navigator'],
    },
    preload: runsOnServerSide ? languages : [],
  });

export default function useTranslation(language: Language, ns: Namespace, options: UseTranslationOptions<string>) {
  const [cookies, setCookie] = useCookies([cookieName]);
  const ret = useTranslationOrg(ns, options);
  const { i18n } = ret;

  const [activeLng, setActiveLng] = useState(i18n.resolvedLanguage);

  useEffect(() => {
    setActiveLng(i18n.resolvedLanguage);
  }, [activeLng, i18n.resolvedLanguage]);

  useEffect(() => {
    if (!language || i18n.resolvedLanguage === language) return;
    i18n.changeLanguage(language);
  }, [language, i18n]);

  useEffect(() => {
    if (cookies.i18next === language) return;
    setCookie(cookieName, language, {
      path: '/',
      maxAge: 365 * 24 * 60 * 60,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });
  }, [language, cookies.i18next, setCookie]);

  if (runsOnServerSide && language && i18n.resolvedLanguage !== language) {
    i18n.changeLanguage(language);
    return ret;
  }

  return ret;
}
