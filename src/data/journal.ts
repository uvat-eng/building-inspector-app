import { useCallback, useEffect, useState } from 'react';

const API = 'https://functions.poehali.dev/4f49fdaa-17fc-4a33-8ce5-205aca1e2f75';

export const JOURNAL_CATEGORIES = [
  'ОТ',
  'ИД, ОТД',
  'Аттестация сварщиков',
  'Геодезические',
  'Сварочно-монтажные работы',
  'ЭМР',
  'Складирование, мусор',
] as const;

export const JOURNAL_STATUSES = ['не устранено', 'устранено'] as const;

export const JOURNAL_RESPONSIBILITIES = ['вопрос подрядчика', 'вопрос заказчика'] as const;

export interface JournalEntry {
  id: string;
  authorId: string;
  authorFio: string;
  objectTitle: string;
  projectTitle: string;
  date: string;
  contractor: string;
  content: string;
  recordedBy: string;
  ackBy: string;
  measures: string;
  fixStatus: string;
  fixDate: string;
  responsibility: string;
  orderNote: string;
  category: string;
  sourceKind?: string;
  sourceId?: string;
  sourceNumber?: string;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}

export const isFixed = (s?: string) => (s ?? '').toLowerCase().startsWith('устранен');

export const useJournal = (filter: { authorId?: string } = {}) => {
  const [items, setItems] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { authorId } = filter;

  const reload = useCallback(async () => {
    const q = authorId ? `?author_id=${encodeURIComponent(authorId)}` : '';
    const res = await fetch(`${API}${q}`);
    if (!res.ok) throw new Error('load_failed');
    const { items: list } = (await res.json()) as { items: JournalEntry[] };
    setItems(list ?? []);
    return list ?? [];
  }, [authorId]);

  useEffect(() => {
    setLoading(true);
    reload()
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [reload]);

  const create = useCallback(async (payload: Partial<JournalEntry>) => {
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('create_failed');
    const { item } = (await res.json()) as { item: JournalEntry };
    setItems((p) => [item, ...p]);
    return item;
  }, []);

  const update = useCallback(async (id: string, patch: Partial<JournalEntry>) => {
    const res = await fetch(API, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...patch }),
    });
    if (!res.ok) throw new Error('update_failed');
    const { item } = (await res.json()) as { item: JournalEntry };
    setItems((p) => p.map((r) => (r.id === id ? item : r)));
    return item;
  }, []);

  const remove = useCallback(async (id: string) => {
    setItems((p) => p.filter((r) => r.id !== id));
    await fetch(`${API}?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
  }, []);

  const importMany = useCallback(async (rows: Partial<JournalEntry>[]) => {
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'import', items: rows }),
    });
    if (!res.ok) throw new Error('import_failed');
    const { items: list, count } = (await res.json()) as {
      items: JournalEntry[];
      count: number;
    };
    setItems((p) => [...list, ...p]);
    return count;
  }, []);

  return { items, loading, reload, create, update, remove, importMany };
};

export interface JournalStat {
  issuedContractor: number;
  issuedCustomer: number;
  fixedContractor: number;
  fixedCustomer: number;
  openContractor: number;
  openCustomer: number;
}

export const journalStat = (list: JournalEntry[]): JournalStat => {
  const by = (resp: string, fixed?: boolean) =>
    list.filter(
      (e) =>
        (e.responsibility || 'вопрос подрядчика') === resp &&
        (fixed === undefined || isFixed(e.fixStatus) === fixed),
    ).length;
  return {
    issuedContractor: by('вопрос подрядчика'),
    issuedCustomer: by('вопрос заказчика'),
    fixedContractor: by('вопрос подрядчика', true),
    fixedCustomer: by('вопрос заказчика', true),
    openContractor: by('вопрос подрядчика', false),
    openCustomer: by('вопрос заказчика', false),
  };
};

export const groupByObject = (list: JournalEntry[]) => {
  const map = new Map<string, JournalEntry[]>();
  list.forEach((e) => {
    const key = e.objectTitle || 'Без объекта';
    map.set(key, [...(map.get(key) ?? []), e]);
  });
  return [...map.entries()].map(([title, items]) => ({ title, items }));
};