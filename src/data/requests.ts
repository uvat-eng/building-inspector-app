import { useCallback, useEffect, useState } from 'react';

const API = 'https://functions.poehali.dev/473e5202-fa24-4e56-86a2-ac4dc50eec5f';

export type RequestKind = 'material' | 'ticket' | 'expense';

export const REQUEST_INFO: Record<
  RequestKind,
  { title: string; note: string; icon: string; unit: string }
> = {
  material: {
    title: 'Заявки на материалы и обеспечение',
    note: 'Расходники, инструмент, спецодежда и обеспечение по объектам',
    icon: 'PackagePlus',
    unit: 'шт.',
  },
  ticket: {
    title: 'Заявки на покупку билетов',
    note: 'Проезд на вахту и обратно · маршрут, даты, пассажиры',
    icon: 'Plane',
    unit: 'билет',
  },
  expense: {
    title: 'Авансовые отчёты',
    note: 'Уходят руководителю проекта на утверждение',
    icon: 'Receipt',
    unit: 'руб.',
  },
};

export const REQUEST_STATUSES = [
  'на согласовании',
  'утверждено',
  'отклонено',
  'исполнено',
] as const;

export interface RequestLine {
  id: string;
  name: string;
  qty: string;
  unit: string;
  price: string;
  note: string;
}

export interface WorkRequest {
  id: string;
  kind: RequestKind;
  number: string;
  authorId: string;
  authorFio: string;
  locationId: string;
  objectId: string;
  objectTitle: string;
  title: string;
  note: string;
  needDate: string;
  status: string;
  total: number;
  items: RequestLine[];
  meta: Record<string, string>;
  decidedBy: string;
  decidedAt: string;
  decisionNote: string;
  createdAt: string;
}

export const lineSum = (l: RequestLine) =>
  (Number(String(l.qty).replace(',', '.')) || 0) *
  (Number(String(l.price).replace(',', '.')) || 0);

export const requestTotal = (items: RequestLine[]) =>
  items.reduce((a, l) => a + lineSum(l), 0);

export const useRequests = (kind?: RequestKind) => {
  const [items, setItems] = useState<WorkRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const res = await fetch(`${API}${kind ? `?kind=${kind}` : ''}`);
    if (!res.ok) throw new Error('load_failed');
    const { items: list } = (await res.json()) as { items: WorkRequest[] };
    setItems(list ?? []);
    return list ?? [];
  }, [kind]);

  useEffect(() => {
    setLoading(true);
    reload()
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [reload]);

  const create = useCallback(async (data: Partial<WorkRequest>) => {
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('create_failed');
    const { item } = (await res.json()) as { item: WorkRequest };
    setItems((p) => [item, ...p]);
    return item;
  }, []);

  const update = useCallback(async (id: string, patch: Partial<WorkRequest>) => {
    const res = await fetch(API, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...patch }),
    });
    if (!res.ok) throw new Error('update_failed');
    const { item } = (await res.json()) as { item: WorkRequest };
    setItems((p) => p.map((r) => (r.id === id ? item : r)));
    return item;
  }, []);

  const remove = useCallback(async (id: string) => {
    setItems((p) => p.filter((r) => r.id !== id));
    await fetch(`${API}?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
  }, []);

  return { items, loading, reload, create, update, remove };
};
