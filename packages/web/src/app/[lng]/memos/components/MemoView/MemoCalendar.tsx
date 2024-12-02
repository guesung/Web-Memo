'use client';

import 'react-big-calendar/lib/css/react-big-calendar.css';

import { useSearchParams } from '@extension/shared/modules/search-params';
import type { GetMemoResponse } from '@extension/shared/utils';
import { LanguageType } from '@src/modules/i18n';
import useTranslation from '@src/modules/i18n/client';
import { motion } from 'framer-motion';
import moment from 'moment';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import { Calendar, type Event, momentLocalizer, type View } from 'react-big-calendar';

const localizer = momentLocalizer(moment);
import 'moment/locale/ko';

import { Button } from '@src/components/ui/button';
import { cn } from '@src/utils';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';

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
        max={new Date(2025, 12, 31)}
        min={new Date(2024, 10, 1)}
        showMultiDayTimes
        views={['month', 'agenda']}
        onSelectEvent={handleItemClick}
        popup
        components={{
          month: {
            dateHeader: ({ date }) => {
              return <div className="text-center">{moment(date).format('DD')}</div>;
            },
            event: ({ event }) => {
              return <div className="text-center">{event.title}a</div>;
            },
          },
          agenda: {
            date: ({ day }) => {
              return <div className="text-center">{moment(day).format('LL')}</div>;
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

                <h2 className="text-xl font-semibold">{moment(date).format('LL')}</h2>

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
