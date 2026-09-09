import { useCallback, useEffect, useState } from 'react';
import { compressPhoto } from '@/data/photoQueue';

const API = 'https://functions.poehali.dev/9022e72d-518c-4632-8607-444c1079934b';
const EVENT = 'gsi-fleet-changed';

export type FleetKind = 'shift' | 'repair' | 'expense' | 'act' | 'maint' | 'day';
export type DayState = 'line' | 'repair';
export type RepairKind = 'repair' | 'service';
export type ExpenseSource = 'podotchet' | 'own';

export interface FleetShift {
  id: string;
  vehicleId: string;
  driverId: string;
  driverFio: string;
  startAt: string;
  endAt: string;
  note: string;
  author: string;
  createdAt: string;
}

export interface FleetRepair {
  id: string;
  vehicleId: string;
  kind: RepairKind;
  title: string;
  repairDate: string;
  ym: string;
  odometer: number;
  amount: number;
  parts: string;
  status: string;
  photos: string[];
  note: string;
  author: string;
  authorRole: string;
  createdAt: string;
}

export interface FleetExpense {
  id: string;
  vehicleId: string;
  driverFio: string;
  expDate: string;
  ym: string;
  source: ExpenseSource;
  title: string;
  amount: number;
  qty: number;
  unit: string;
  photos: string[];
  note: string;
  status: string;
  author: string;
  createdAt: string;
}

export interface ActItem {
  title: string;
  qty: string;
  unit: string;
  note: string;
}

export interface FleetAct {
  acceptDate: string;
  exterior: string;
  defects: string;
  breakdowns: string;
  advice: string;
  id: string;
  vehicleId: string;
  kind: string;
  actNo: string;
  actDate: string;
  driverFio: string;
  acceptFio: string;
  odometer: number;
  condition: string;
  items: ActItem[];
  photos: string[];
  note: string;
  status: string;
  author: string;
  createdAt: string;
}

export interface FleetMaint {
  id: string;
  vehicleId: string;
  itemKey: string;
  lastAt: string;
  nextAt: string;
  odometer: number;
  note: string;
  author: string;
  updatedAt: string;
}

export interface FleetDay {
  id: string;
  vehicleId: string;
  driverFio: string;
  day: string;
  ym: string;
  state: DayState;
  share: number;
  note: string;
  author: string;
  createdAt: string;
}

export const MAINT_ITEMS: { key: string; label: string; icon: string }[] = [
  { key: 'engine_oil', label: 'Масло двигателя', icon: 'Droplet' },
  { key: 'gear_oil', label: 'Масло коробки передач', icon: 'Cog' },
  { key: 'chassis', label: 'Ходовая часть', icon: 'CircleDot' },
  { key: 'brakes', label: 'Тормоза', icon: 'Disc' },
  { key: 'lights', label: 'Световые приборы', icon: 'Lightbulb' },
  { key: 'wash', label: 'Мойка машины', icon: 'SprayCan' },
];

export const DAY_LABEL: Record<DayState, string> = {
  line: 'На линии',
  repair: 'На ремонте',
};

export interface PhotoInput {
  name: string;
  mime: string;
  content: string;
}

export const SOURCE_LABEL: Record<ExpenseSource, string> = {
  podotchet: 'Выдано в подотчёт',
  own: 'Купил сам',
};

export const REPAIR_LABEL: Record<RepairKind, string> = {
  repair: 'Ремонт',
  service: 'ТО',
};

export const money = (v: number) =>
  new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(v || 0);

export const ruDate = (v?: string) => {
  if (!v) return '';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString('ru');
};

export const ymTitle = (ym: string) => {
  const m = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
  ];
  const [y, mm] = ym.split('-');
  return m[Number(mm) - 1] ? `${m[Number(mm) - 1]} ${y}` : ym || 'Без даты';
};

export const useFleet = () => {
  const [shifts, setShifts] = useState<FleetShift[]>([]);
  const [repairs, setRepairs] = useState<FleetRepair[]>([]);
  const [expenses, setExpenses] = useState<FleetExpense[]>([]);
  const [acts, setActs] = useState<FleetAct[]>([]);
  const [maint, setMaint] = useState<FleetMaint[]>([]);
  const [days, setDays] = useState<FleetDay[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(API);
      if (!r.ok) throw new Error('load_failed');
      const d = (await r.json()) as {
        shifts: FleetShift[];
        repairs: FleetRepair[];
        expenses: FleetExpense[];
        acts: FleetAct[];
        maint: FleetMaint[];
        days: FleetDay[];
      };
      setShifts(d.shifts ?? []);
      setRepairs(d.repairs ?? []);
      setExpenses(d.expenses ?? []);
      setActs(d.acts ?? []);
      setMaint(d.maint ?? []);
      setDays(d.days ?? []);
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

  return { shifts, repairs, expenses, acts, maint, days, loading, reload };
};

const ping = () => window.dispatchEvent(new Event(EVENT));

export const createFleet = async <T,>(kind: FleetKind, payload: Record<string, unknown>) => {
  const r = await fetch(`${API}?kind=${kind}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, kind }),
  });
  if (!r.ok) throw new Error('create_failed');
  ping();
  return ((await r.json()) as { item: T }).item;
};

export const patchFleet = async (
  kind: FleetKind,
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

export const removeFleet = async (kind: FleetKind, id: string) => {
  const r = await fetch(`${API}?kind=${kind}&id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  if (!r.ok) throw new Error('delete_failed');
  ping();
};

export const readPhotos = (files: FileList | File[]) =>
  Promise.all(
    [...files].slice(0, 12).map(async (file) => {
      if (file.type.startsWith('image/')) {
        const content = await compressPhoto(file);
        return { name: file.name, mime: 'image/jpeg', content } as PhotoInput;
      }
      return new Promise<PhotoInput>((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve({ name: file.name, mime: file.type, content: String(fr.result) });
        fr.onerror = () => reject(new Error('read_failed'));
        fr.readAsDataURL(file);
      });
    }),
  );

/** Активная вахта на дату: началась и ещё не закончилась. */
export const activeShift = (shifts: FleetShift[], vehicleId: string, today = new Date()) => {
  const t = today.toISOString().slice(0, 10);
  return (
    shifts.find(
      (s) => s.vehicleId === vehicleId && (!s.startAt || s.startAt <= t) && (!s.endAt || s.endAt >= t),
    ) ?? null
  );
};

/** Сколько дней осталось до даты: отрицательное — просрочено. */
export const daysTo = (date?: string) => {
  if (!date) return null;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - t.getTime()) / 86400000);
};