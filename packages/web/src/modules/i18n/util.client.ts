"use client";

import i18next, { type Namespace } from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import resourcesToBackend from "i18next-resources-to-backend";
import { useEffect, useState } from "react";
import { useCookies } from "react-cookie";
import {
	initReactI18next,
	useTranslation as useTranslationOrg,
	type UseTranslationOptions,
} from "react-i18next";

import { cookieName, SUPPORTED_LANGUAGES } from "./constant";
import type { Language } from "./type";
import { getOptions } from "./util";

const runsOnServerSide = typeof window === "undefined";

i18next
	.use(initReactI18next)
	.use(LanguageDetector)
	.use(
		resourcesToBackend(
			(language: Language) => import(`./locales/${language}/translation.json`),
		),
	)
	.init({
		...getOptions(),
		lng: undefined,
		debug: false,
		detection: {
			order: ["path", "htmlTag", "cookie", "navigator"],
		},
		preload: runsOnServerSide ? SUPPORTED_LANGUAGES : [],
	});

export default function useTranslation(
	language?: Language,
	ns?: Namespace,
	options?: UseTranslationOptions<string>,
) {
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
		if (!language || cookies.i18next === language) return;
		setCookie(cookieName, language, {
			path: "/",
			maxAge: 365 * 24 * 60 * 60,
			secure: process.env.NODE_ENV === "production",
			sameSite: "strict",
		});
	}, [language, cookies.i18next, setCookie]);

	if (runsOnServerSide && language && i18n.resolvedLanguage !== language) {
		i18n.changeLanguage(language);
		return ret;
	}

	return ret;
}
