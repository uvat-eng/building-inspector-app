import { useCallback, useEffect, useState } from 'react';

const API = 'https://functions.poehali.dev/3ff70a62-794a-4171-9c0d-0be2fefef354';

export type Season = 'winter' | 'summer' | 'all';
export type PpeStatus = 'active' | 'pending' | 'writeoff';

export interface PpeItem {
  id: string;
  holderId: string;
  holderFio: string;
  objectId: string;
  title: string;
  season: Season;
  size: string;
  qty: number;
  issuedAt: string;
  wearMonths: number;
  expiresAt: string;
  status: PpeStatus;
  note: string;
  createdAt: string;
}

export type WriteoffStatus = 'review' | 'approval' | 'done' | 'declined';

export interface Writeoff {
  id: string;
  holderId: string;
  holderFio: string;
  objectId: string;
  itemIds: string[];
  items: { title: string; size: string; qty: number; issuedAt: string; season: Season }[];
  reason: string;
  photos: string[];
  status: WriteoffStatus;
  engineerFio: string;
  engineerAt: string;
  managerFio: string;
  managerAt: string;
  declineReason: string;
  actNo: string;
  createdAt: string;
}

export interface EquipmentItem {
  id: string;
  holderId: string;
  holderFio: string;
  objectId: string;
  title: string;
  invNo: string;
  serialNo: string;
  condition: string;
  verifiedAt: string;
  verifiedTo: string;
  photos: string[];
  status: string;
  receivedAt: string;
  note: string;
  createdAt: string;
}

export interface EquipmentMove {
  id: string;
  equipmentId: string;
  fromFio: string;
  toFio: string;
  condition: string;
  photos: string[];
  movedAt: string;
}

export const SEASON_LABEL: Record<Season, string> = {
  winter: 'Зима',
  summer: 'Лето',
  all: 'Всесезонная',
};

export const SEASON_MONTHS: Record<Season, number> = {
  winter: 24,
  summer: 12,
  all: 24,
};

export const PPE_PRESET = [
  'Костюм рабочий летний',
  'Костюм утеплённый зимний',
  'Ботинки кожаные с защитным подноском',
  'Сапоги утеплённые',
  'Каска защитная',
  'Жилет сигнальный',
  'Перчатки с полимерным покрытием',
  'Очки защитные',
  'Подшлемник',
  'Бельё нательное утеплённое',
];

export const daysLeft = (expiresAt: string) => {
  if (!expiresAt) return null;
  const d = new Date(expiresAt);
  if (Number.isNaN(d.getTime())) return null;
  return Math.round((d.getTime() - Date.now()) / 86400000);
};

export const fmt = (iso: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('ru');
};

const load = async <T,>(query: string): Promise<T[]> => {
  const res = await fetch(`${API}${query}`);
  if (!res.ok) throw new Error('load_failed');
  const { items } = (await res.json()) as { items: T[] };
  return items ?? [];
};

export const usePpe = (holderId?: string) => {
  const [items, setItems] = useState<PpeItem[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const list = await load<PpeItem>(
      `?kind=ppe${holderId ? `&holder_id=${encodeURIComponent(holderId)}` : ''}`,
    );
    setItems(list);
    return list;
  }, [holderId]);

  useEffect(() => {
    setLoading(true);
    reload()
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [reload]);

  const add = useCallback(
    async (data: Partial<PpeItem>) => {
      const res = await fetch(`${API}?kind=ppe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, kind: 'ppe' }),
      });
      if (!res.ok) throw new Error('add_failed');
      const { item } = (await res.json()) as { item: PpeItem };
      setItems((p) => [item, ...p]);
      return item;
    },
    [],
  );

  const remove = useCallback(async (id: string) => {
    setItems((p) => p.filter((i) => i.id !== id));
    await fetch(`${API}?kind=ppe&id=${encodeURIComponent(id)}`, { method: 'DELETE' });
  }, []);

  return { items, loading, add, remove, reload };
};

export const useWriteoffs = (holderId?: string) => {
  const [items, setItems] = useState<Writeoff[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const list = await load<Writeoff>(
      `?kind=writeoffs${holderId ? `&holder_id=${encodeURIComponent(holderId)}` : ''}`,
    );
    setItems(list);
    return list;
  }, [holderId]);

  useEffect(() => {
    setLoading(true);
    reload()
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [reload]);

  const create = useCallback(async (data: Partial<Writeoff> & { itemIds: string[] }) => {
    const res = await fetch(`${API}?kind=writeoff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, kind: 'writeoff' }),
    });
    if (!res.ok) throw new Error('create_failed');
    const { item } = (await res.json()) as { item: Writeoff };
    setItems((p) => [item, ...p]);
    return item;
  }, []);

  const decide = useCallback(
    async (id: string, step: 'engineer' | 'manager' | 'decline', who: string, reason = '') => {
      const res = await fetch(`${API}?kind=writeoff`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'writeoff', id, step, who, reason }),
      });
      if (!res.ok) throw new Error('decide_failed');
      const { item } = (await res.json()) as { item: Writeoff };
      setItems((p) => p.map((w) => (w.id === id ? item : w)));
      return item;
    },
    [],
  );

  return { items, loading, create, decide, reload };
};

export const useEquipment = (holderId?: string) => {
  const [items, setItems] = useState<EquipmentItem[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const list = await load<EquipmentItem>(
      `?kind=equipment${holderId ? `&holder_id=${encodeURIComponent(holderId)}` : ''}`,
    );
    setItems(list);
    return list;
  }, [holderId]);

  useEffect(() => {
    setLoading(true);
    reload()
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [reload]);

  const add = useCallback(async (data: Partial<EquipmentItem> & { photos?: string[] }) => {
    const res = await fetch(`${API}?kind=equipment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, kind: 'equipment' }),
    });
    if (!res.ok) throw new Error('add_failed');
    const { item } = (await res.json()) as { item: EquipmentItem };
    setItems((p) => [item, ...p]);
    return item;
  }, []);

  const transfer = useCallback(
    async (data: {
      equipmentIds: string[];
      fromId?: string;
      fromFio?: string;
      toId?: string;
      toFio: string;
      objectId?: string;
      condition?: string;
      photos?: string[];
      movedAt?: string;
    }) => {
      const res = await fetch(`${API}?kind=transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, kind: 'transfer' }),
      });
      if (!res.ok) throw new Error('transfer_failed');
      return (await res.json()) as { items: EquipmentMove[] };
    },
    [],
  );

  const remove = useCallback(async (id: string) => {
    setItems((p) => p.filter((i) => i.id !== id));
    await fetch(`${API}?kind=equipment&id=${encodeURIComponent(id)}`, { method: 'DELETE' });
  }, []);

  return { items, loading, add, transfer, remove, reload };
};
