'use client';

import 'react-big-calendar/lib/css/react-big-calendar.css';

import { useSearchParams } from '@extension/shared/modules/search-params';
import { GetMemoResponse } from '@extension/shared/utils';
import { LanguageType } from '@src/modules/i18n';
import useTranslation from '@src/modules/i18n/client';
import moment from 'moment';
import { useRouter } from 'next/navigation';
import { SyntheticEvent, useCallback, useMemo, useState } from 'react';
import { Calendar, momentLocalizer, type View, Views } from 'react-big-calendar';

const localizer = momentLocalizer(moment);

interface MemoCalendarProps extends LanguageType {
  memos: GetMemoResponse[];
}

export default function MemoCalendar({ lng, memos }: MemoCalendarProps) {
  const { t } = useTranslation(lng);
  const [view, setView] = useState<View>('month');
  const [date, setDate] = useState<Date>(new Date());
  const searchParams = useSearchParams();
  const router = useRouter();

  const { views } = useMemo(
    () => ({
      views: Object.keys(Views).map(k => Views[k as keyof typeof Views]),
    }),
    [],
  );

  const events = useMemo(() => {
    return memos.map(memo => ({
      id: memo.id,
      title: memo.title,
      start: moment(memo.created_at).toDate(),
      end: moment(memo.created_at).toDate(),
    }));
  }, [memos]);

  const handleItemClick = useCallback(
    (event: SyntheticEvent<HTMLElement>) => {
      const id = event.id;
      if (!id) return;

      searchParams.set('id', id);
      router.replace(searchParams.getUrl(), { scroll: false });
    },
    [searchParams, router],
  );

  return (
    <Calendar
      localizer={localizer}
      defaultView={Views.DAY}
      onView={setView}
      view={view}
      date={date}
      onNavigate={setDate}
      events={events}
      startAccessor="start"
      endAccessor="end"
      // style={{ height: 780, width: '100%' }}
      max={new Date(2025, 12, 31)}
      min={new Date(2024, 10, 1)}
      showMultiDayTimes
      step={60}
      views={views}
      onSelectEvent={handleItemClick}
    />
  );
}
