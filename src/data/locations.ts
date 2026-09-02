import { useCallback, useEffect, useState } from 'react';

const API = 'https://functions.poehali.dev/78133056-3e64-4567-9c70-8387ccbfb929?kind=locations';
const CACHE = 'gsi-locations-cache-v1';
const EVENT = 'gsi-locations-changed';

export interface Location {
  id: string;
  title: string;
  icon: string;
  note: string;
  sort: number;
}

export const FALLBACK: Location[] = [
  { id: 'yakutia', title: 'Якутия', icon: 'Snowflake', note: '', sort: 1 },
  { id: 'megion', title: 'Мегион', icon: 'Mountain', note: '', sort: 2 },
  { id: 'messoyakha', title: 'Мессояха', icon: 'Waves', note: '', sort: 3 },
  { id: 'meretoyakha', title: 'Меретояха', icon: 'Waves', note: '', sort: 4 },
  { id: 'azs', title: 'Проект АЗС', icon: 'Fuel', note: '', sort: 5 },
  { id: 'fuel-depot', title: 'Проект склады топлива', icon: 'Warehouse', note: '', sort: 6 },
  { id: 'plants', title: 'Проект заводы', icon: 'Factory', note: '', sort: 7 },
];

let cache: Location[] = (() => {
  try {
    const raw = localStorage.getItem(CACHE);
    return raw ? (JSON.parse(raw) as Location[]) : FALLBACK;
  } catch {
    return FALLBACK;
  }
})();

const publish = (list: Location[]) => {
  cache = list;
  try {
    localStorage.setItem(CACHE, JSON.stringify(list));
  } catch {
    /* переполнение хранилища не критично */
  }
  window.dispatchEvent(new Event(EVENT));
};

export const useLocations = () => {
  const [list, setList] = useState<Location[]>(cache);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(API);
      const d = await r.json();
      if (Array.isArray(d.items)) publish(d.items);
    } catch {
      /* офлайн — работаем из кэша */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const sync = () => setList(cache);
    window.addEventListener(EVENT, sync);
    reload();
    return () => window.removeEventListener(EVENT, sync);
  }, [reload]);

  const add = useCallback(
    async (loc: Omit<Location, 'sort'> & { sort?: number }) => {
      await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loc),
      });
      await reload();
    },
    [reload],
  );

  const patch = useCallback(
    async (id: string, data: Partial<Location>) => {
      await fetch(API, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...data }),
      });
      await reload();
    },
    [reload],
  );

  const remove = useCallback(
    async (id: string) => {
      await fetch(API, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      await reload();
    },
    [reload],
  );

  return { list, loading, reload, add, patch, remove };
};

export const locTitle = (list: Location[], id: string) =>
  list.find((l) => l.id === id)?.title ?? (id || 'Без локации');

export const locIcon = (list: Location[], id: string) =>
  list.find((l) => l.id === id)?.icon ?? 'MapPin';
