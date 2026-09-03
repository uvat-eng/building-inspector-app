import { useCallback, useEffect, useState } from 'react';

const API = 'https://functions.poehali.dev/aecd2cda-d066-40fe-b154-847370000434';

export type SignedSection = 'tests' | 'ks2' | 'incoming' | 'm19m29' | 'pos_ppr';

export interface SignedDoc {
  id: string;
  objectId: string;
  section: SignedSection;
  period: string;
  title: string;
  fileUrl: string;
  fileName: string;
  mime: string;
  fileSize: number;
  note: string;
  uploadedBy: string;
  createdAt: string;
}

export const SECTION_META: Record<
  SignedSection,
  { label: string; icon: string; note: string; byMonth: boolean; hint: string }
> = {
  tests: {
    label: 'Подписанные акты испытаний',
    icon: 'FlaskConical',
    note: 'Протоколы и акты испытаний по месяцам',
    byMonth: true,
    hint: 'Сфотографируйте подписанный акт испытаний',
  },
  ks2: {
    label: 'Подписанные акты КС-2',
    icon: 'FileSpreadsheet',
    note: 'Акты выполненных работ по месяцам',
    byMonth: true,
    hint: 'Сфотографируйте подписанный акт КС-2',
  },
  incoming: {
    label: 'Акты входного контроля',
    icon: 'PackageCheck',
    note: 'Входной контроль материалов по месяцам',
    byMonth: true,
    hint: 'Сфотографируйте подписанный акт входного контроля',
  },
  m19m29: {
    label: 'Подписанные формы М-19, М-29',
    icon: 'ClipboardList',
    note: 'Отчёты о расходе материалов по месяцам',
    byMonth: true,
    hint: 'Сфотографируйте подписанную форму М-19 или М-29',
  },
  pos_ppr: {
    label: 'ПОС и ППР',
    icon: 'BookMarked',
    note: 'Загрузка вручную инспектором',
    byMonth: false,
    hint: 'Загрузка вручную инспектором — сканированная версия документа',
  },
};

export const MONTHS_RU = [
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

export const periodLabel = (period: string) => {
  const [y, m] = period.split('-');
  const idx = Number(m) - 1;
  return `${MONTHS_RU[idx] ?? m} ${y}`;
};

export const monthsOfYear = (year: number) =>
  MONTHS_RU.map((_, i) => `${year}-${String(i + 1).padStart(2, '0')}`);

export const useSignedDocs = (objectId: string, section: SignedSection) => {
  const [items, setItems] = useState<SignedDoc[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const res = await fetch(
        `${API}?object_id=${encodeURIComponent(objectId)}&section=${section}`,
      );
      const { items: list } = (await res.json()) as { items: SignedDoc[] };
      setItems(list ?? []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [objectId, section]);

  useEffect(() => {
    setLoading(true);
    reload();
  }, [reload]);

  const upload = useCallback(
    async (payload: {
      period: string;
      content: string;
      fileName: string;
      mime: string;
      title?: string;
      note?: string;
      uploadedBy?: string;
    }) => {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ objectId, section, ...payload }),
      });
      if (!res.ok) throw new Error('upload_failed');
      const { item } = (await res.json()) as { item: SignedDoc };
      setItems((p) => [item, ...p]);
      return item;
    },
    [objectId, section],
  );

  const remove = useCallback(async (id: string) => {
    setItems((p) => p.filter((d) => d.id !== id));
    await fetch(`${API}?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
  }, []);

  return { items, loading, upload, remove, reload };
};

export default useSignedDocs;

export const useAllSignedDocs = () => {
  const [items, setItems] = useState<SignedDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(API)
      .then((r) => r.json())
      .then((d: { items: SignedDoc[] }) => setItems(d.items ?? []))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  return { items, loading };
};
