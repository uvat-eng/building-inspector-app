import { useCallback, useEffect, useState } from 'react';

export interface TimeEntry {
  objectId: string;
  objectTitle: string;
  from: string;
  to: string;
}

export type Timesheet = Record<string, TimeEntry[]>;

const KEY = 'gsi-timesheet-v2';
const OLD_KEY = 'gsi-timesheet-v1';
const EVENT = 'gsi-timesheet-changed';

export const minutes = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

export const entryHours = (e: TimeEntry) => {
  let diff = minutes(e.to) - minutes(e.from);
  if (diff <= 0) diff += 24 * 60;
  return diff / 60;
};

export const SHIFTS = [
  { id: 'day', label: 'Дневная 08:00–20:00', from: '08:00', to: '20:00' },
  { id: 'night', label: 'Ночная 20:00–08:00', from: '20:00', to: '08:00' },
] as const;

export const shiftOf = (list: TimeEntry[] = []) => {
  if (!list.length) return null;
  const start = minutes(list[0].from);
  return start >= 20 * 60 || start < 8 * 60 ? 'night' : 'day';
};

export const dayHours = (list: TimeEntry[] = []) =>
  list.reduce((s, e) => s + entryHours(e), 0);

export const fmtHours = (h: number) =>
  Number.isInteger(h) ? String(h) : h.toFixed(2).replace(/0$/, '').replace('.', ',');

const migrate = (): Timesheet => {
  try {
    const old = localStorage.getItem(OLD_KEY);
    if (!old) return {};
    const parsed = JSON.parse(old) as Record<string, { objectId: string; objectTitle: string; hours: number }>;
    const next: Timesheet = {};
    Object.entries(parsed).forEach(([k, v]) => {
      const end = Math.min(8 * 60 + Math.round((v.hours || 0) * 60), 24 * 60);
      const hh = String(Math.floor(end / 60)).padStart(2, '0');
      const mm = String(end % 60).padStart(2, '0');
      next[k] = [
        { objectId: v.objectId, objectTitle: v.objectTitle, from: '08:00', to: `${hh}:${mm}` },
      ];
    });
    localStorage.setItem(KEY, JSON.stringify(next));
    localStorage.removeItem(OLD_KEY);
    return next;
  } catch {
    return {};
  }
};

const read = (): Timesheet => {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Timesheet;
    return migrate();
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

  const setDay = useCallback((key: string, list: TimeEntry[] | null) => {
    const next = read();
    if (list && list.length) next[key] = list;
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