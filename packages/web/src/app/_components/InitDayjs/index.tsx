"use client";

import "dayjs/locale/en";
import "dayjs/locale/ko";

import type { LanguageType } from "@src/modules/i18n";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { useEffect } from "react";

interface InitDayjsProps extends LanguageType {}

export default function InitDayjs({ lng }: InitDayjsProps) {
	useEffect(() => {
		dayjs.extend(timezone);
		dayjs.extend(utc);
		dayjs.extend(relativeTime);
		dayjs.locale(lng);
	}, [lng]);

	return null;
}
