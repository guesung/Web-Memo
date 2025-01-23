'use client';

import { LanguageType } from '@src/modules/i18n';
import dayjs from 'dayjs';
import 'dayjs/locale/en';
import 'dayjs/locale/ko';
import relativeTime from 'dayjs/plugin/relativeTime';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(timezone);
dayjs.extend(utc);
dayjs.extend(relativeTime);

interface InitDayjsProps extends LanguageType {}

export default function InitDayjs({ lng }: InitDayjsProps) {
  dayjs.locale(lng);

  return null;
}
