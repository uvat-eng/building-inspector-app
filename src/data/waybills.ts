import { useCallback, useEffect, useState } from 'react';

const API = 'https://functions.poehali.dev/9ef8566d-cc0c-4c8d-ab06-da2fc32de951';
const EVENT = 'gsi-waybills-changed';

export interface WbTask {
  customer: string;
  arrive: string;
  leave: string;
  work: string;
}

export interface WbWork {
  route: string;
  work: string;
  arrive: string;
  leave: string;
  odoIn: string;
  odoOut: string;
}

export interface Waybill {
  id: string;
  vehicleId: string;
  number: string;
  series: string;
  wbDate: string;
  ym: string;
  validFrom: string;
  validTo: string;
  org: string;
  customer: string;
  customerPerson: string;
  columnNo: string;
  brigade: string;
  carModel: string;
  carPlate: string;
  trailerModel: string;
  trailerPlate: string;
  driverFio: string;
  tabNo: string;
  license: string;
  driverClass: string;
  snils: string;
  transportKind: string;
  messageKind: string;
  departAt: string;
  returnAt: string;
  odoOut: number;
  odoIn: number;
  zeroRun: number;
  fuelBrand: string;
  fuelIssued: number;
  fuelOut: number;
  fuelIn: number;
  fuelReturned: number;
  fuelNorm: number;
  fuelFact: number;
  tasks: WbTask[];
  works: WbWork[];
  medBefore: string;
  medAfter: string;
  techBefore: string;
  techAfter: string;
  dispatcher: string;
  notes: string;
  status: string;
  author: string;
  createdAt: string;
}

export interface PartItem {
  title: string;
  article: string;
  qty: string;
  unit: string;
  note: string;
}

export interface PartRequest {
  id: string;
  vehicleId: string;
  driverFio: string;
  reqNo: string;
  reqDate: string;
  ym: string;
  urgency: 'normal' | 'urgent' | 'stop';
  items: PartItem[];
  reason: string;
  photos: string[];
  status: 'new' | 'work' | 'done' | 'declined';
  answer: string;
  answerBy: string;
  answerAt: string;
  author: string;
  createdAt: string;
}

export const URGENCY_LABEL: Record<PartRequest['urgency'], string> = {
  normal: 'Плановая',
  urgent: 'Срочная',
  stop: 'Машина стоит',
};

export const PART_STATUS: Record<PartRequest['status'], string> = {
  new: 'Новая',
  work: 'В работе',
  done: 'Выдано',
  declined: 'Отклонена',
};

export const PART_TONE: Record<PartRequest['status'], string> = {
  new: 'border-destructive text-destructive',
  work: 'border-amber-500 text-amber-600',
  done: 'border-emerald-600 text-emerald-600',
  declined: 'border-border text-muted-foreground',
};

export const ORG_DEFAULT =
  'ООО "ГЛОБАЛ-Стройинжиниринг", ИНН 7203181210, ОГРН 1067203344823';

export const useWaybills = () => {
  const [waybills, setWaybills] = useState<Waybill[]>([]);
  const [parts, setParts] = useState<PartRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(API);
      if (!r.ok) throw new Error('load_failed');
      const d = (await r.json()) as { waybills: Waybill[]; parts: PartRequest[] };
      setWaybills(d.waybills ?? []);
      setParts(d.parts ?? []);
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

  return { waybills, parts, loading, reload };
};

const ping = () => window.dispatchEvent(new Event(EVENT));

export const createWaybill = async (payload: Record<string, unknown>) => {
  const r = await fetch(`${API}?kind=waybill`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, kind: 'waybill' }),
  });
  if (!r.ok) throw new Error('create_failed');
  ping();
  return ((await r.json()) as { item: Waybill }).item;
};

export const createPartRequest = async (payload: Record<string, unknown>) => {
  const r = await fetch(`${API}?kind=part`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, kind: 'part' }),
  });
  if (!r.ok) throw new Error('create_failed');
  ping();
  return ((await r.json()) as { item: PartRequest }).item;
};

export const patchWb = async (
  kind: 'waybill' | 'part',
  id: string,
  patch: Record<string, unknown>,
) => {
  const r = await fetch(`${API}?kind=${kind}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, patch, kind }),
  });
  if (!r.ok) throw new Error('update_failed');
  ping();
};

export const removeWb = async (kind: 'waybill' | 'part', id: string) => {
  const r = await fetch(`${API}?kind=${kind}&id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  if (!r.ok) throw new Error('delete_failed');
  ping();
};
