'use client';

import 'react-big-calendar/lib/css/react-big-calendar.css';

import { useSearchParams } from '@extension/shared/modules/search-params';
import type { GetMemoResponse } from '@extension/shared/utils';
import { LanguageType } from '@src/modules/i18n';
import useTranslation from '@src/modules/i18n/client';
import moment from 'moment';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import { Calendar, type Event, momentLocalizer, type View } from 'react-big-calendar';

const localizer = momentLocalizer(moment);

interface ExtendedEvent extends Event {
  id: string;
}

interface MemoCalendarProps extends LanguageType {
  memos: GetMemoResponse[];
}

export default function MemoCalendar({ lng, memos }: MemoCalendarProps) {
  const { t } = useTranslation(lng);
  const [view, setView] = useState<View>('month');
  const [date, setDate] = useState<Date>(new Date());
  const searchParams = useSearchParams();
  const router = useRouter();

  const events: ExtendedEvent[] = useMemo(() => {
    return memos.map(memo => ({
      id: String(memo.id),
      title: memo.title,
      start: moment(memo.created_at).toDate(),
      end: moment(memo.created_at).toDate(),
    }));
  }, [memos]);

  const handleItemClick = useCallback(
    (event: ExtendedEvent) => {
      const id = event.id;

      searchParams.set('id', id);
      router.replace(searchParams.getUrl(), { scroll: false });
    },
    [searchParams, router],
  );

  return (
    <Calendar
      localizer={localizer}
      onView={setView}
      view={view}
      date={date}
      onNavigate={setDate}
      events={events}
      startAccessor="start"
      endAccessor="end"
      max={new Date(2025, 12, 31)}
      min={new Date(2024, 10, 1)}
      showMultiDayTimes
      views={['month', 'agenda']}
      onSelectEvent={handleItemClick}
      className="h-[780px] w-[1000px]"
      popup
    />
  );
}
