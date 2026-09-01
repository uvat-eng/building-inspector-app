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
  generalContractor: string;
  subcontractor: string;
  inspector: string;
  status: 'draft' | 'done';
  note: string;
  actUrl: string;
  defectCount?: number;
  createdAt: string;
}

export const uploadAct = async (inspectionId: string, html: string) => {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'act', inspectionId, content: html }),
  });
  if (!res.ok) throw new Error('upload_failed');
  return (await res.json()) as { url: string; item: Inspection };
};

export interface InspectionDefect {
  id: string;
  inspectionId: string;
  pos: number;
  title: string;
  deadline: string;
  normRef: string;
  severity: Severity;
  photos: string[];
}

export type Severity = 'critical' | 'normal' | 'minor';

export const SEVERITY: Record<Severity, { label: string; days: number; tone: string }> = {
  critical: { label: 'Немедленно', days: 0, tone: 'hot' },
  normal: { label: '7 дней', days: 7, tone: 'wait' },
  minor: { label: '30 дней', days: 30, tone: 'dim' },
};

export const deadlineFor = (severity: Severity, from = new Date()) => {
  const d = new Date(from);
  d.setDate(d.getDate() + SEVERITY[severity].days);
  return d.toLocaleDateString('ru');
};

const NORMS_API = 'https://functions.poehali.dev/b9b1a996-8cf5-4866-aae2-e1589553e231';

export interface NormMatch {
  ref: string;
  name: string;
  source: 'ai' | 'base' | 'manual';
  author?: string;
  score: number;
  alts?: { ref: string; name: string }[];
}

export interface WorkSummary {
  defects: number;
  inspections: number;
  orders: number;
}

export const useSummary = () => {
  const [summary, setSummary] = useState<WorkSummary>({
    defects: 0,
    inspections: 0,
    orders: 0,
  });

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch(`${API}?action=summary`)
        .then((r) => r.json())
        .then((d: WorkSummary) => alive && setSummary(d))
        .catch(() => undefined);
    load();
    const t = setInterval(load, 30000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  return summary;
};

export interface DefectRow extends InspectionDefect {
  inspNumber: string;
  objectId: string;
  workType: string;
  inspector: string;
  inspDate: string;
}

export const useAllDefects = () => {
  const [items, setItems] = useState<DefectRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}?action=all_defects`)
      .then((r) => r.json())
      .then((d: { items: DefectRow[] }) => setItems(d.items ?? []))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  return { items, loading };
};

export const teachNorm = async (text: string, ref: string, author = '') => {
  const [head, ...tail] = ref.split('—');
  await fetch(NORMS_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'learn',
      text,
      ref: head.trim(),
      name: tail.join('—').trim(),
      author,
    }),
  });
};

export const suggestNorms = async (texts: string[], ai = false): Promise<NormMatch[]> => {
  const res = await fetch(NORMS_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items: texts, ai }),
  });
  if (!res.ok) throw new Error('norms_failed');
  const { items } = (await res.json()) as { items: NormMatch[] };
  return items;
};

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