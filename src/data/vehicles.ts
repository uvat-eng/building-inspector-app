import { useCallback, useEffect, useState } from 'react';

const API = 'https://functions.poehali.dev/68e74250-3805-448a-90f0-6fa74f3f0739';

export type VehicleKind = 'car' | 'truck' | 'bus' | 'special';
export type VehicleStatus = 'На линии' | 'ТО' | 'Ремонт' | 'Стоянка';
export type LogKind = 'service' | 'fuel' | 'waybill';

export const KIND_LABEL: Record<VehicleKind, string> = {
  car: 'Легковой',
  truck: 'Грузовой',
  bus: 'Автобус / вахтовка',
  special: 'Спецтехника',
};

export const KIND_ICON: Record<VehicleKind, string> = {
  car: 'Car',
  truck: 'Truck',
  bus: 'Bus',
  special: 'Tractor',
};

export const STATUSES: VehicleStatus[] = ['На линии', 'ТО', 'Ремонт', 'Стоянка'];

export const LOG_LABEL: Record<LogKind, string> = {
  service: 'Техобслуживание',
  fuel: 'Заправка',
  waybill: 'Путевой лист',
};

export const LOG_ICON: Record<LogKind, string> = {
  service: 'Wrench',
  fuel: 'Fuel',
  waybill: 'FileText',
};

export interface Vehicle {
  id: string;
  plate: string;
  model: string;
  kind: VehicleKind;
  driver: string;
  locationId: string;
  odometer: number;
  fuelNorm: number;
  serviceAt: string;
  osagoTo: string;
  status: VehicleStatus;
  note: string;
  createdBy: string;
  createdAt: string;
}

export interface VehicleLog {
  id: string;
  vehicleId: string;
  kind: LogKind;
  date: string;
  odometer: number;
  amount: number;
  content: string;
  author: string;
}

export type VehicleDraft = Partial<Omit<Vehicle, 'id' | 'kind'>> & {
  plate: string;
  model: string;
  vehicleKind?: VehicleKind;
};

export const useVehicles = () => {
  const [items, setItems] = useState<Vehicle[]>([]);
  const [logs, setLogs] = useState<VehicleLog[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const res = await fetch(API);
    if (!res.ok) throw new Error('load_failed');
    const data = (await res.json()) as { items: Vehicle[]; logs: VehicleLog[] };
    setItems(data.items ?? []);
    setLogs(data.logs ?? []);
  }, []);

  useEffect(() => {
    setLoading(true);
    reload()
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [reload]);

  const create = useCallback(async (draft: VehicleDraft) => {
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draft),
    });
    if (!res.ok) throw new Error('create_failed');
    const { item } = (await res.json()) as { item: Vehicle };
    setItems((p) => [item, ...p]);
    return item;
  }, []);

  const update = useCallback(async (id: string, patch: Record<string, string | number>) => {
    const res = await fetch(API, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, patch }),
    });
    if (!res.ok) throw new Error('update_failed');
    const { item } = (await res.json()) as { item: Vehicle };
    setItems((p) => p.map((v) => (v.id === id ? item : v)));
    return item;
  }, []);

  const remove = useCallback(async (id: string) => {
    setItems((p) => p.filter((v) => v.id !== id));
    setLogs((p) => p.filter((l) => l.vehicleId !== id));
    await fetch(`${API}?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
  }, []);

  const addLog = useCallback(
    async (kind: LogKind, payload: Omit<VehicleLog, 'id' | 'kind'>) => {
      const res = await fetch(`${API}?kind=${kind}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, kind }),
      });
      if (!res.ok) throw new Error('log_failed');
      const { log } = (await res.json()) as { log: VehicleLog };
      setLogs((p) => [log, ...p]);
      if (payload.odometer) {
        setItems((p) =>
          p.map((v) =>
            v.id === payload.vehicleId && v.odometer < payload.odometer
              ? { ...v, odometer: payload.odometer }
              : v,
          ),
        );
      }
      return log;
    },
    [],
  );

  const removeLog = useCallback(async (id: string) => {
    setLogs((p) => p.filter((l) => l.id !== id));
    await fetch(`${API}?log_id=${encodeURIComponent(id)}`, { method: 'DELETE' });
  }, []);

  return { items, logs, loading, create, update, remove, addLog, removeLog, reload };
};

export const fmtDate = (d: string) => (d ? new Date(d).toLocaleDateString('ru') : '—');

export const daysLeft = (date: string) => {
  if (!date) return null;
  const diff = new Date(date).getTime() - Date.now();
  return Math.ceil(diff / 86400000);
};
