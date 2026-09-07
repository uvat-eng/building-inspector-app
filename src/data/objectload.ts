import { useCallback, useEffect, useMemo, useState } from 'react';

const API = 'https://functions.poehali.dev/658b0054-c684-4e23-b138-4e38df85430e';

export interface LoadDay {
  id: string;
  objectId: string;
  day: string;
  staffPlan: number;
  staffFact: number;
  techPlan: number;
  techFact: number;
  cabins: number;
  note: string;
  authorFio: string;
}

export const isoDay = (d: Date) => d.toISOString().slice(0, 10);

export const today = () => isoDay(new Date());

export const lastDays = (n: number) =>
  Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (n - 1 - i));
    return isoDay(d);
  });

export const shortDay = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('ru', { day: '2-digit', month: '2-digit' });
};

export const weekDay = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'][d.getDay()];
};

export const useObjectLoad = (days = 14) => {
  const [items, setItems] = useState<LoadDay[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const res = await fetch(`${API}?days=${days}`);
    if (!res.ok) throw new Error('load_failed');
    const { items: list } = (await res.json()) as { items: LoadDay[] };
    setItems(list ?? []);
    return list ?? [];
  }, [days]);

  useEffect(() => {
    setLoading(true);
    reload()
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [reload]);

  const save = useCallback(async (rows: Partial<LoadDay>[]) => {
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: rows }),
    });
    if (!res.ok) throw new Error('save_failed');
    const { items: saved } = (await res.json()) as { items: LoadDay[] };
    setItems((p) => {
      const map = new Map(p.map((r) => [`${r.objectId}|${r.day.slice(0, 10)}`, r]));
      saved.forEach((r) => map.set(`${r.objectId}|${r.day.slice(0, 10)}`, r));
      return [...map.values()];
    });
    return saved;
  }, []);

  const byObject = useMemo(() => {
    const map = new Map<string, Record<string, LoadDay>>();
    items.forEach((r) => {
      const cur = map.get(r.objectId) ?? {};
      cur[r.day.slice(0, 10)] = r;
      map.set(r.objectId, cur);
    });
    return map;
  }, [items]);

  return { items, byObject, loading, reload, save };
};
