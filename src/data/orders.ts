import { useCallback, useEffect, useState } from 'react';

const API = 'https://functions.poehali.dev/4b9b6a4b-1a7d-4a19-919c-7896601ecac5';

export interface Order {
  id: string;
  objectId: string;
  inspectionId: string;
  number: string;
  issuedTo: string;
  inspector: string;
  deadline: string;
  status: 'open' | 'done';
  body: {
    workType?: string;
    docRef?: string;
    contractorRep?: string;
    generalContractor?: string;
    subcontractor?: string;
    objectTitle?: string;
    objectCode?: string;
    inspectionOrg?: string;
    contractNo?: string;
    contractDate?: string;
    assignDocNo?: string;
    assignDocDate?: string;
    customerName?: string;
    customerRep?: string;
    time?: string;
    stopNote?: string;
    stopWorks?: string;
    items?: {
      pos: number;
      title: string;
      normRef?: string;
      deadline?: string;
      photos: string[];
    }[];
  };
  fileUrl: string;
  stopWorks?: boolean;
  fixDate?: string;
  category?: string;
  extendNote?: string;
  createdAt: string;
}

export type ContractorKind = 'general' | 'sub';

export interface Contractor {
  id: string;
  objectId: string;
  kind: ContractorKind;
  name: string;
  inn: string;
  address: string;
  director: string;
  phone: string;
  email: string;
  works: string;
}

export const EMPTY_CONTRACTOR: Contractor = {
  id: '',
  objectId: '',
  kind: 'sub',
  name: '',
  inn: '',
  address: '',
  director: '',
  phone: '',
  email: '',
  works: '',
};

export const useOrders = (objectId?: string) => {
  const [items, setItems] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const q = objectId ? `?object_id=${encodeURIComponent(objectId)}` : '';
    const res = await fetch(`${API}${q}`);
    if (!res.ok) throw new Error('load_failed');
    const { items: list } = (await res.json()) as { items: Order[] };
    setItems(list);
    return list;
  }, [objectId]);

  useEffect(() => {
    setLoading(true);
    reload()
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [reload]);

  const create = useCallback(async (data: Partial<Order> & { objectId: string }) => {
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('create_failed');
    const { item } = (await res.json()) as { item: Order };
    setItems((p) => [item, ...p]);
    return item;
  }, []);

  const update = useCallback(async (id: string, patch: Partial<Order>) => {
    setItems((p) => p.map((o) => (o.id === id ? { ...o, ...patch } : o)));
    await fetch(API, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, patch }),
    });
  }, []);

  const remove = useCallback(async (id: string) => {
    setItems((p) => p.filter((o) => o.id !== id));
    await fetch(`${API}?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
  }, []);

  return { items, loading, create, update, remove, reload };
};

export const useContractor = (objectId: string) => {
  const [list, setList] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const res = await fetch(`${API}?kind=contractor&object_id=${encodeURIComponent(objectId)}`);
    if (!res.ok) throw new Error('load_failed');
    const { items } = (await res.json()) as { items: Contractor[] };
    setList(items ?? []);
    return items ?? [];
  }, [objectId]);

  useEffect(() => {
    if (!objectId) return;
    setLoading(true);
    reload()
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [objectId, reload]);

  const save = useCallback(
    async (data: Partial<Contractor>) => {
      const res = await fetch(`${API}?kind=contractor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'contractor', objectId, ...data }),
      });
      if (!res.ok) throw new Error('save_failed');
      const { item } = (await res.json()) as { item: Contractor };
      setList((p) => {
        const has = p.some((c) => c.id === item.id);
        return has ? p.map((c) => (c.id === item.id ? item : c)) : [...p, item];
      });
      return item;
    },
    [objectId],
  );

  const remove = useCallback(async (id: string) => {
    setList((p) => p.filter((c) => c.id !== id));
    await fetch(`${API}?kind=contractor&id=${encodeURIComponent(id)}`, { method: 'DELETE' });
  }, []);

  const general = list.find((c) => c.kind === 'general') ?? null;
  const subs = list.filter((c) => c.kind === 'sub');

  return { list, general, subs, contractor: general, loading, save, remove, reload };
};