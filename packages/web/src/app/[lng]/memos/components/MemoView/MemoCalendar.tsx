'use client';

import 'react-big-calendar/lib/css/react-big-calendar.css';

import { useSearchParams } from '@extension/shared/modules/search-params';
import type { GetMemoResponse } from '@extension/shared/utils';
import { Button } from '@src/components/ui/button';
import { LanguageType } from '@src/modules/i18n';
import useTranslation from '@src/modules/i18n/client';
import { cn } from '@src/utils';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import { motion } from 'framer-motion';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import { Calendar, dayjsLocalizer, type Event, type View } from 'react-big-calendar';

dayjs.extend(timezone);

const localizer = dayjsLocalizer(dayjs);

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
    return memos.map(({ id, title, created_at }) => ({
      id: String(id),
      title: title,
      start: dayjs(created_at).toDate(),
      end: dayjs(created_at).toDate(),
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
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="h-[780px] w-full md:w-[calc(100vw-200px)]">
      <Calendar
        localizer={localizer}
        onView={setView}
        view={view}
        date={date}
        onNavigate={setDate}
        events={events}
        startAccessor="start"
        endAccessor="end"
        showMultiDayTimes
        views={['month', 'agenda']}
        onSelectEvent={handleItemClick}
        popup
        components={{
          month: {
            dateHeader: ({ date }) => {
              return <div className="text-center">{dayjs(date).format('DD')}</div>;
            },
            event: ({ event }) => {
              return <div className="text-center">{event.title}a</div>;
            },
          },
          agenda: {
            // @ts-expect-error: TODO: fix this
            date: ({ day }) => {
              return <div className="text-center">{dayjs(day).format('LL')}</div>;
            },
          },
          toolbar: ({ date, view, views, onView, onNavigate }) => {
            return (
              <div className="mb-4 flex items-center justify-between px-4">
                <div className="flex gap-2">
                  <Button onClick={() => onNavigate('PREV')} variant="ghost">
                    <ChevronLeftIcon />
                  </Button>
                  <Button onClick={() => onNavigate('TODAY')} variant="ghost">
                    Today
                  </Button>
                  <Button onClick={() => onNavigate('NEXT')} variant="ghost">
                    <ChevronRightIcon />
                  </Button>
                </div>

                <h2 className="text-xl font-semibold">{dayjs(date).format('LL')}</h2>

                <div className="flex gap-2">
                  {(views as View[]).map(name => (
                    <Button
                      key={name}
                      onClick={() => onView(name as View)}
                      variant="outline"
                      className={cn(
                        'text-primary bg-primary-bg text-primary-dark rounded px-3 py-1.5 hover:text-cyan-600',
                        {
                          'text-cyan-600': name === view,
                        },
                      )}>
                      {name}
                    </Button>
                  ))}
                </div>
              </div>
            );
          },
        }}
        messages={{
          today: t('common.today'),
          previous: t('common.previous'),
          next: t('common.next'),
          month: t('common.month'),
          agenda: t('common.agenda'),
          day: t('common.day'),
          week: t('common.week'),
          allDay: t('common.allDay'),
          date: t('common.date'),
          time: t('common.time'),
          event: t('common.title'),
          showMore: (_, __, events) => {
            return `..${events.length} ${t('common.more')}`;
          },
        }}
      />
    </motion.div>
  );
}
