import { useCallback, useEffect, useState } from 'react';

const API = 'https://functions.poehali.dev/16bba767-7607-4307-b145-a71f3bff2cc5';

export type IndReportKind =
  | 'obustroystvo'
  | 'ispolnitelnaya'
  | 'otpb'
  | 'geodeziya'
  | 'kapremont'
  | 'inzhpodgotovka';

export const KIND_META: Record<IndReportKind, { label: string; icon: string; note: string }> = {
  obustroystvo: {
    label: 'Обустройство',
    icon: 'HardHat',
    note: 'Строительно-монтажные работы, объёмы, наряд-допуски',
  },
  ispolnitelnaya: {
    label: 'Исполнительная документация',
    icon: 'FileStack',
    note: 'Проверка АОСР, journals, комплектность ИД',
  },
  otpb: {
    label: 'ОТ, ПБ и ООС',
    icon: 'ShieldCheck',
    note: 'Охрана труда, промбезопасность, экология, ресурсы',
  },
  geodeziya: {
    label: 'Геодезия',
    icon: 'Ruler',
    note: 'Дублирующий геодезический контроль, оборудование, поверки',
  },
  kapremont: {
    label: 'Капитальный ремонт',
    icon: 'Wrench',
    note: 'Ремонтные работы, объёмы, ТК и ППР',
  },
  inzhpodgotovka: {
    label: 'Инженерная подготовка',
    icon: 'Mountain',
    note: 'Земляные работы, отсыпка, планировка территории',
  },
};

export const KIND_LIST = Object.keys(KIND_META) as IndReportKind[];

export interface VolumeRow {
  name: string;
  unit: string;
  qty: string;
}

export interface PermitRow {
  number: string;
  start: string;
  end: string;
  work: string;
  responsible: string;
}

export interface DocRow {
  code: string;
  name: string;
  status: string;
}

export interface ResourceRow {
  name: string;
  qty: string;
}

export interface EquipRow {
  name: string;
  serial: string;
  verification: string;
}

export interface IndReportData {
  objectTitle?: string;
  direction?: string;
  customerName?: string;
  customerAddress?: string;
  customerAttn?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerCopies?: string;
  customerHead?: string;
  contractNo?: string;
  contractDate?: string;
  orderNo?: string;
  requestNo?: string;
  inspectionWith?: string;
  generalContractor?: string;
  subcontractor?: string;
  contractorContract?: string;
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  contactExtra?: string;
  status?: string;
  weather?: string;
  workTime?: string;
  prevInspector?: string;
  actions?: string;
  area?: string;
  reference?: string;
  permits?: PermitRow[];
  zogDate?: string;
  zogStatus?: string;
  zogNote?: string;
  volumes?: VolumeRow[];
  docs?: DocRow[];
  staff?: ResourceRow[];
  machines?: ResourceRow[];
  equipment?: EquipRow[];
  photos?: { url: string; caption: string }[];
  conclusion?: string;
}

export interface IndReport {
  id: string;
  objectId: string;
  kind: IndReportKind;
  number: string;
  date: string;
  authorId: string;
  authorFio: string;
  status: string;
  data: IndReportData;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}

export const STATUSES = [
  'Принято',
  'Обнаружено несоответствие',
  'Отложено',
  'Прочее',
] as const;

export const useIndReports = (filter: { authorId?: string } = {}) => {
  const [items, setItems] = useState<IndReport[]>([]);
  const [loading, setLoading] = useState(true);
  const { authorId } = filter;

  const reload = useCallback(async () => {
    const q = authorId ? `?author_id=${encodeURIComponent(authorId)}` : '';
    const res = await fetch(`${API}${q}`);
    if (!res.ok) throw new Error('load_failed');
    const { items: list } = (await res.json()) as { items: IndReport[] };
    setItems(list ?? []);
    return list ?? [];
  }, [authorId]);

  useEffect(() => {
    setLoading(true);
    reload()
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [reload]);

  const create = useCallback(async (payload: Partial<IndReport>) => {
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('create_failed');
    const { item } = (await res.json()) as { item: IndReport };
    setItems((p) => [item, ...p]);
    return item;
  }, []);

  const update = useCallback(async (id: string, patch: Partial<IndReport>) => {
    const res = await fetch(API, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...patch }),
    });
    if (!res.ok) throw new Error('update_failed');
    const { item } = (await res.json()) as { item: IndReport };
    setItems((p) => p.map((r) => (r.id === id ? item : r)));
    return item;
  }, []);

  const remove = useCallback(async (id: string) => {
    setItems((p) => p.filter((r) => r.id !== id));
    await fetch(`${API}?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
  }, []);

  return { items, loading, reload, create, update, remove };
};

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

export interface DayNode {
  key: string;
  label: string;
  items: IndReport[];
}

export interface MonthNode {
  key: string;
  label: string;
  days: DayNode[];
  count: number;
}

export interface YearNode {
  key: string;
  label: string;
  months: MonthNode[];
  count: number;
}

export const groupByDate = (items: IndReport[]): YearNode[] => {
  const years = new Map<string, Map<string, Map<string, IndReport[]>>>();

  items.forEach((r) => {
    const [y = '—', m = '01', d = '01'] = (r.date || '').split('-');
    if (!years.has(y)) years.set(y, new Map());
    const months = years.get(y)!;
    if (!months.has(m)) months.set(m, new Map());
    const days = months.get(m)!;
    days.set(d, [...(days.get(d) ?? []), r]);
  });

  return [...years.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([y, months]) => {
      const monthNodes = [...months.entries()]
        .sort((a, b) => b[0].localeCompare(a[0]))
        .map(([m, days]) => {
          const dayNodes = [...days.entries()]
            .sort((a, b) => b[0].localeCompare(a[0]))
            .map(([d, list]) => ({
              key: `${y}-${m}-${d}`,
              label: `${d}.${m}.${y}`,
              items: list,
            }));
          return {
            key: `${y}-${m}`,
            label: `${MONTHS[Number(m) - 1] ?? m} ${y}`,
            days: dayNodes,
            count: dayNodes.reduce((s, n) => s + n.items.length, 0),
          };
        });
      return {
        key: y,
        label: y,
        months: monthNodes,
        count: monthNodes.reduce((s, n) => s + n.count, 0),
      };
    });
};
