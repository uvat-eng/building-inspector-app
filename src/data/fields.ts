import { useCallback, useEffect, useState } from 'react';

const API = 'https://functions.poehali.dev/78133056-3e64-4567-9c70-8387ccbfb929?kind=fields';
const CACHE = 'gsi-fields-cache-v1';
const EVENT = 'gsi-fields-changed';

export interface Field {
  id: string;
  locationId: string;
  title: string;
  note: string;
  sort: number;
}

let cache: Field[] = (() => {
  try {
    const raw = localStorage.getItem(CACHE);
    return raw ? (JSON.parse(raw) as Field[]) : [];
  } catch {
    return [];
  }
})();

const publish = (list: Field[]) => {
  cache = list;
  try {
    localStorage.setItem(CACHE, JSON.stringify(list));
  } catch {
    /* переполнение хранилища не критично */
  }
  window.dispatchEvent(new Event(EVENT));
};

export const useFields = (locationId?: string) => {
  const [all, setAll] = useState<Field[]>(cache);
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
    const sync = () => setAll(cache);
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    reload();
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, [reload]);

  const add = useCallback(
    async (f: { locationId: string; title: string; note?: string; createdBy?: string }) => {
      await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: '', ...f }),
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

  const list = locationId ? all.filter((f) => f.locationId === locationId) : all;

  return { list, all, loading, add, remove, reload };
};
