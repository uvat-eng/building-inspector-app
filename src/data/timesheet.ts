import { useCallback, useEffect, useState } from 'react';

export interface TimeEntry {
  objectId: string;
  objectTitle: string;
  hours: number;
}

export type Timesheet = Record<string, TimeEntry>;

const KEY = 'gsi-timesheet-v1';
const EVENT = 'gsi-timesheet-changed';

const read = (): Timesheet => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Timesheet) : {};
  } catch {
    return {};
  }
};

export const dayKey = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

export const MONTHS = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
];

export const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export const useTimesheet = () => {
  const [sheet, setSheet] = useState<Timesheet>(read);

  useEffect(() => {
    const sync = () => setSheet(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const setDay = useCallback((key: string, entry: TimeEntry | null) => {
    const next = read();
    if (entry) next[key] = entry;
    else delete next[key];
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(EVENT));
  }, []);

  return { sheet, setDay };
};

export const monthEntries = (sheet: Timesheet, y: number, m: number) =>
  Object.entries(sheet)
    .filter(([k]) => k.startsWith(`${y}-${String(m + 1).padStart(2, '0')}`))
    .sort(([a], [b]) => a.localeCompare(b));
