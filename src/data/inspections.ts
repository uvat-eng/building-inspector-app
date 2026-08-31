import { useCallback, useEffect, useState } from 'react';

const API = 'https://functions.poehali.dev/26fd0e42-bb64-4022-acb0-097508981039';
const CACHE = 'gsi-inspections-v1';

export interface Inspection {
  id: string;
  objectId: string;
  number: string;
  workType: string;
  docRef: string;
  contractorRep: string;
  inspector: string;
  status: 'draft' | 'done';
  note: string;
  actUrl: string;
  createdAt: string;
}

export interface InspectionDefect {
  id: string;
  inspectionId: string;
  pos: number;
  title: string;
  deadline: string;
  photos: string[];
}

export const WORK_TYPES = [
  'Земляные работы',
  'Свайные работы и фундаменты',
  'Монолитные железобетонные конструкции',
  'Металлоконструкции',
  'Сварочные работы',
  'Антикоррозийная защита',
  'Кровельные работы',
  'Технологические трубопроводы',
  'Электромонтажные работы',
  'КИПиА и слаботочные системы',
  'Благоустройство территории',
];

export const DOC_SECTIONS = [
  'ПЗ — пояснительная записка',
  'ПЗУ — планировочная организация участка',
  'АР — архитектурные решения',
  'КР — конструктивные решения',
  'ЭС — система электроснабжения',
  'ВК — водоснабжение и канализация',
  'ОВ — отопление и вентиляция',
  'СС — сети связи',
  'ТХ — технологические решения',
  'ПОС — проект организации строительства',
];

const readCache = (): Record<string, Inspection[]> => {
  try {
    return JSON.parse(localStorage.getItem(CACHE) || '{}');
  } catch {
    return {};
  }
};

const writeCache = (objectId: string, items: Inspection[]) => {
  const all = readCache();
  all[objectId] = items;
  try {
    localStorage.setItem(CACHE, JSON.stringify(all));
  } catch {
    /* переполнение */
  }
};

export const useInspections = (objectId: string) => {
  const [items, setItems] = useState<Inspection[]>(() => readCache()[objectId] ?? []);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const res = await fetch(`${API}?object_id=${encodeURIComponent(objectId)}`);
    if (!res.ok) throw new Error('load_failed');
    const { items: list } = (await res.json()) as { items: Inspection[] };
    writeCache(objectId, list);
    setItems(list);
    return list;
  }, [objectId]);

  useEffect(() => {
    setItems(readCache()[objectId] ?? []);
    setLoading(true);
    reload()
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [objectId, reload]);

  const create = useCallback(
    async (data: Partial<Inspection>) => {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, objectId }),
      });
      if (!res.ok) throw new Error('create_failed');
      const { item } = (await res.json()) as { item: Inspection };
      setItems((p) => {
        const next = [item, ...p];
        writeCache(objectId, next);
        return next;
      });
      return item;
    },
    [objectId],
  );

  const update = useCallback(
    async (id: string, patch: Partial<Inspection>) => {
      setItems((p) => {
        const next = p.map((i) => (i.id === id ? { ...i, ...patch } : i));
        writeCache(objectId, next);
        return next;
      });
      await fetch(API, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, patch }),
      });
    },
    [objectId],
  );

  const remove = useCallback(
    async (id: string) => {
      setItems((p) => {
        const next = p.filter((i) => i.id !== id);
        writeCache(objectId, next);
        return next;
      });
      await fetch(`${API}?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    },
    [objectId],
  );

  return { items, loading, create, update, remove, reload };
};

export const useDefects = (inspectionId: string) => {
  const [defects, setDefects] = useState<InspectionDefect[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const res = await fetch(`${API}?id=${encodeURIComponent(inspectionId)}`);
    if (!res.ok) throw new Error('load_failed');
    const data = (await res.json()) as { defects: InspectionDefect[] };
    setDefects(data.defects ?? []);
    return data.defects ?? [];
  }, [inspectionId]);

  useEffect(() => {
    if (!inspectionId) return;
    setLoading(true);
    reload()
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [inspectionId, reload]);

  const add = useCallback(
    async (title: string, deadline = '') => {
      const res = await fetch(`${API}?action=defect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'defect', inspectionId, title, deadline }),
      });
      if (!res.ok) throw new Error('add_failed');
      const { defect } = (await res.json()) as { defect: InspectionDefect };
      setDefects((p) => [...p, defect]);
      return defect;
    },
    [inspectionId],
  );

  const update = useCallback(async (id: string, patch: Partial<InspectionDefect>) => {
    setDefects((p) => p.map((d) => (d.id === id ? { ...d, ...patch } : d)));
    await fetch(`${API}?action=defect`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'defect', id, ...patch }),
    });
  }, []);

  const remove = useCallback(async (id: string) => {
    setDefects((p) => p.filter((d) => d.id !== id));
    await fetch(`${API}?defect_id=${encodeURIComponent(id)}`, { method: 'DELETE' });
  }, []);

  return { defects, loading, add, update, remove, reload };
};
