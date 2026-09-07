import { useCallback, useEffect, useState } from 'react';

const API = 'https://functions.poehali.dev/8095bfe2-8d13-4fd7-9a9f-ddb9065f984f';

export type DocSection = 'tables' | 'geodesy' | 'card';

export const SECTION_INFO: Record<
  DocSection,
  { title: string; note: string; icon: string; hint: string }
> = {
  tables: {
    title: 'Отчёты таблицы',
    note: 'Сводки по объектам и подрядчикам · ежедневная работа',
    icon: 'Table2',
    hint: 'Ручная корректировка в Excel. Сюда подгружать готовые файлы.',
  },
  geodesy: {
    title: 'Акты дубля геодезии',
    note: 'Съёмка с телефона или загрузка файла · хранение и свод',
    icon: 'Ruler',
    hint: 'Ручная корректировка в Excel. Сюда подгружать готовые файлы.',
  },
  card: {
    title: 'Контрольная карточка объекта',
    note: 'Одна карточка на объект · сводка уходит в карточку объекта',
    icon: 'ClipboardCheck',
    hint: 'Ручная корректировка в Excel. Сюда подгружать готовые файлы.',
  },
};

export interface ObjectDoc {
  id: string;
  section: DocSection;
  objectId: string;
  objectTitle: string;
  contractor: string;
  title: string;
  docNumber: string;
  docDate: string;
  period: string;
  note: string;
  status: string;
  fileName: string;
  url: string;
  mime: string;
  sizeKb: number;
  version: number;
  summary: Record<string, string>;
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
}

export const DOC_STATUSES = ['актуально', 'на проверке', 'устарело'] as const;

export const CARD_SUMMARY_FIELDS: { key: string; label: string }[] = [
  { key: 'readiness', label: 'Готовность объекта, %' },
  { key: 'stage', label: 'Текущий этап работ' },
  { key: 'defects', label: 'Открытых замечаний' },
  { key: 'orders', label: 'Действующих предписаний' },
  { key: 'people', label: 'Людей на объекте' },
  { key: 'tech', label: 'Единиц техники' },
  { key: 'deadline', label: 'Срок завершения' },
  { key: 'risks', label: 'Риски и узкие места' },
];

export const useObjectDocs = (section?: DocSection, objectId?: string) => {
  const [items, setItems] = useState<ObjectDoc[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const q = new URLSearchParams();
    if (section) q.set('section', section);
    if (objectId) q.set('object_id', objectId);
    const res = await fetch(`${API}${q.toString() ? `?${q}` : ''}`);
    if (!res.ok) throw new Error('load_failed');
    const { items: list } = (await res.json()) as { items: ObjectDoc[] };
    setItems(list ?? []);
    return list ?? [];
  }, [section, objectId]);

  useEffect(() => {
    setLoading(true);
    reload()
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [reload]);

  const upload = useCallback(
    async (file: File | Blob, meta: Partial<ObjectDoc> & { fileName: string }) => {
      const buf = await file.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let bin = '';
      const chunk = 8192;
      for (let i = 0; i < bytes.length; i += chunk)
        bin += String.fromCharCode(...bytes.subarray(i, i + chunk));

      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...meta,
          section: meta.section ?? section ?? 'tables',
          fileBase64: btoa(bin),
          mime: (file as File).type || 'application/octet-stream',
        }),
      });
      if (!res.ok) throw new Error('upload_failed');
      const { item } = (await res.json()) as { item: ObjectDoc };
      setItems((p) => [item, ...p]);
      return item;
    },
    [section],
  );

  const update = useCallback(async (id: string, patch: Partial<ObjectDoc>) => {
    const res = await fetch(API, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...patch }),
    });
    if (!res.ok) throw new Error('update_failed');
    const { item } = (await res.json()) as { item: ObjectDoc };
    setItems((p) => p.map((r) => (r.id === id ? item : r)));
    return item;
  }, []);

  const remove = useCallback(async (id: string) => {
    setItems((p) => p.filter((r) => r.id !== id));
    await fetch(`${API}?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
  }, []);

  return { items, loading, reload, upload, update, remove };
};

export const groupDocs = (items: ObjectDoc[], by: 'object' | 'contractor') => {
  const map = new Map<string, ObjectDoc[]>();
  items.forEach((d) => {
    const key =
      (by === 'object' ? d.objectTitle : d.contractor) ||
      (by === 'object' ? 'Без объекта' : 'Без подрядчика');
    map.set(key, [...(map.get(key) ?? []), d]);
  });
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([title, docs]) => ({ title, docs }));
};

export const latestCard = (items: ObjectDoc[], objectId: string) =>
  items
    .filter((d) => d.section === 'card' && d.objectId === objectId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] ?? null;
