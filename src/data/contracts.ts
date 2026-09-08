import { useCallback, useEffect, useState } from 'react';

const API = 'https://functions.poehali.dev/de0177b7-7cda-4ff9-9883-31b804dc3283';
const EVENT = 'gsi-contracts-changed';

export interface Contract {
  id: string;
  number: string;
  title: string;
  customer: string;
  locationId: string;
  fieldKey: string;
  objects: string[];
  chief: string;
  signedAt: string;
  startAt: string;
  endAt: string;
  amount: number;
  vat: string;
  note: string;
  status: string;
  author: string;
  createdAt: string;
}

export interface ContractAct {
  id: string;
  contractId: string;
  number: string;
  actDate: string;
  period: string;
  amount: number;
  paid: boolean;
  paidAt: string;
  note: string;
  fileUrl: string;
  fileName: string;
  author: string;
  createdAt: string;
}

export const VAT_OPTIONS = ['Без НДС', 'НДС 20% сверху', 'НДС 20% в том числе'];

export const money = (v: number) =>
  new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(v || 0);

export const ruDate = (v?: string) => {
  if (!v) return '';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString('ru');
};

export const useContracts = () => {
  const [items, setItems] = useState<Contract[]>([]);
  const [acts, setActs] = useState<ContractAct[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(API);
      if (!r.ok) throw new Error('load_failed');
      const d = (await r.json()) as { items: Contract[]; acts: ContractAct[] };
      setItems(d.items ?? []);
      setActs(d.acts ?? []);
    } catch {
      /* оффлайн — оставляем прежние данные */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
    const h = () => reload();
    window.addEventListener(EVENT, h);
    return () => window.removeEventListener(EVENT, h);
  }, [reload]);

  return { items, acts, loading, reload };
};

const ping = () => window.dispatchEvent(new Event(EVENT));

export const createContract = async (c: Partial<Contract>) => {
  const r = await fetch(`${API}?kind=contract`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(c),
  });
  if (!r.ok) throw new Error('create_failed');
  ping();
  return ((await r.json()) as { item: Contract }).item;
};

export const patchContract = async (id: string, patch: Partial<Contract>) => {
  const r = await fetch(`${API}?kind=contract`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, patch, kind: 'contract' }),
  });
  if (!r.ok) throw new Error('update_failed');
  ping();
};

export const removeContract = async (id: string) => {
  const r = await fetch(`${API}?kind=contract&id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  if (!r.ok) throw new Error('delete_failed');
  ping();
};

export const createAct = async (
  a: Partial<ContractAct> & { content?: string; mime?: string },
) => {
  const r = await fetch(`${API}?kind=act`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...a, kind: 'act' }),
  });
  if (!r.ok) throw new Error('create_failed');
  ping();
  return ((await r.json()) as { item: ContractAct }).item;
};

export const patchAct = async (id: string, patch: Partial<ContractAct>) => {
  const r = await fetch(`${API}?kind=act`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, patch, kind: 'act' }),
  });
  if (!r.ok) throw new Error('update_failed');
  ping();
};

export const removeAct = async (id: string) => {
  const r = await fetch(`${API}?kind=act&id=${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!r.ok) throw new Error('delete_failed');
  ping();
};

export const readFile = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(new Error('read_failed'));
    fr.readAsDataURL(file);
  });
