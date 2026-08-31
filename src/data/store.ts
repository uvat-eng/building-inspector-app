import { useCallback, useEffect, useState } from 'react';

export interface ProjectObject {
  id: string;
  title: string;
  field: string;
  kind: 'area' | 'line';
  capacity: string;
  startYear: string;
  endYear: string;
  inspectors: number;
  vehicles: number;
  cabins: number;
  customer: string;
  customerLogo?: string;
  contractNo: string;
  contractSum: number;
  regionId: string;
  regionName: string;
  district: string;
  lon: number;
  lat: number;
  stage: string;
  progress: number;
  start: string;
  deadline: string;
  status: 'work' | 'plan' | 'done' | 'risk';
  staffPlan: number;
  staffFact: number;
  techPlan: number;
  techFact: number;
  orders: number;
  ordersOpen: number;
}

export const KIND_LABEL: Record<ProjectObject['kind'], string> = {
  area: 'Площадной объект',
  line: 'Линейный объект',
};

export const NO_FIELD = 'Без месторождения';

export const groupByField = (list: ProjectObject[]) => {
  const map = new Map<string, ProjectObject[]>();
  list.forEach((o) => {
    const key = o.field?.trim() || NO_FIELD;
    map.set(key, [...(map.get(key) ?? []), o]);
  });
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], 'ru'));
};

export const STATUS_LABEL: Record<ProjectObject['status'], string> = {
  work: 'В работе',
  plan: 'Подготовка',
  done: 'Завершён',
  risk: 'Риск срыва',
};

const KEY = 'gsi-objects-v1';
const EVENT = 'gsi-objects-changed';

const read = (): ProjectObject[] => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ProjectObject[]) : [];
  } catch {
    return [];
  }
};

const write = (list: ProjectObject[]) => {
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new Event(EVENT));
};

export const useObjects = () => {
  const [list, setList] = useState<ProjectObject[]>(read);

  useEffect(() => {
    const sync = () => setList(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const add = useCallback((o: Omit<ProjectObject, 'id'>) => {
    write([...read(), { ...o, id: `obj-${Date.now()}` }]);
  }, []);

  const update = useCallback((id: string, patch: Partial<ProjectObject>) => {
    write(read().map((o) => (o.id === id ? { ...o, ...patch } : o)));
  }, []);

  const remove = useCallback((id: string) => {
    write(read().filter((o) => o.id !== id));
  }, []);

  return { list, add, update, remove };
};

export const summarize = (list: ProjectObject[]) => {
  const inWork = list.filter((o) => o.status === 'work' || o.status === 'risk');
  const sum = (fn: (o: ProjectObject) => number, src = list) =>
    src.reduce((s, o) => s + (fn(o) || 0), 0);

  return {
    portfolio: sum((o) => o.contractSum),
    total: list.length,
    inWork: inWork.length,
    staffPlan: sum((o) => o.staffPlan, inWork),
    staffFact: sum((o) => o.staffFact, inWork),
    techPlan: sum((o) => o.techPlan, inWork),
    techFact: sum((o) => o.techFact, inWork),
    orders: sum((o) => o.orders),
    ordersOpen: sum((o) => o.ordersOpen),
  };
};

export const money = (v: number) => {
  if (!v) return '0 ₽';
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1).replace('.', ',')} млрд ₽`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace('.', ',')} млн ₽`;
  if (v >= 1_000) return `${Math.round(v / 1000)} тыс ₽`;
  return `${v} ₽`;
};