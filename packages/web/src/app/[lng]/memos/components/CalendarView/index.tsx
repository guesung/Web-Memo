'use client';

import 'react-big-calendar/lib/css/react-big-calendar.css';

import moment from 'moment';
import { useMemo, useState } from 'react';
import { Calendar, momentLocalizer, type View, Views } from 'react-big-calendar';

const localizer = momentLocalizer(moment);

const events = [
  {
    id: 0,
    title: 'All Day Event very long title',
    allDay: true,
    start: new Date(2024, 11, 1),
    end: new Date(2024, 11, 2),
  },
];

export default function CalendarView() {
  const [view, setView] = useState<View>('month');
  const [date, setDate] = useState<Date>(new Date());

  const { views } = useMemo(
    () => ({
      views: Object.keys(Views).map(k => Views[k as keyof typeof Views]),
    }),
    [],
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
      style={{ height: 780, width: '100%' }}
      max={new Date(2025, 12, 31)}
      min={new Date(2024, 10, 1)}
      showMultiDayTimes
      step={60}
      views={views}
      onSelectEvent={console.log}
    />
  );
}
