import { useCallback, useEffect, useMemo, useState } from 'react';

const API = 'https://functions.poehali.dev/8eec43fc-1e0e-4218-ae7c-9d69d02e1e00';

export type AssetSheetKind = 'vehicle' | 'cabin';

export const ASSET_DAY_STATUSES = [
  { id: 'work', label: 'Работа', short: 'Р', tone: 'ok' },
  { id: 'idle', label: 'Простой', short: 'П', tone: 'wait' },
  { id: 'service', label: 'ТО', short: 'ТО', tone: 'wait' },
  { id: 'repair', label: 'Ремонт', short: 'РМ', tone: 'hot' },
  { id: 'off', label: 'Не задействован', short: '—', tone: 'dim' },
] as const;

export type AssetDayStatus = (typeof ASSET_DAY_STATUSES)[number]['id'];

export const statusInfo = (id: string) =>
  ASSET_DAY_STATUSES.find((s) => s.id === id) ?? ASSET_DAY_STATUSES[4];

export interface AssetDay {
  id: string;
  assetId: string;
  assetKind: AssetSheetKind;
  day: string;
  status: AssetDayStatus;
  hours: number;
  objectId: string;
  note: string;
  authorFio: string;
}

export const monthKeyOf = (y: number, m: number) => `${y}-${String(m + 1).padStart(2, '0')}`;

export const dayKey = (y: number, m: number, d: number) =>
  `${monthKeyOf(y, m)}-${String(d).padStart(2, '0')}`;

export const useAssetSheet = (kind: AssetSheetKind, month: string) => {
  const [items, setItems] = useState<AssetDay[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const res = await fetch(`${API}?kind=${kind}&month=${month}`);
    if (!res.ok) throw new Error('load_failed');
    const { items: list } = (await res.json()) as { items: AssetDay[] };
    setItems(list ?? []);
    return list ?? [];
  }, [kind, month]);

  useEffect(() => {
    setLoading(true);
    reload()
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [reload]);

  const save = useCallback(async (rows: Partial<AssetDay>[]) => {
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: rows }),
    });
    if (!res.ok) throw new Error('save_failed');
    const { items: saved } = (await res.json()) as { items: AssetDay[] };
    setItems((p) => {
      const map = new Map(p.map((r) => [`${r.assetId}|${r.day}`, r]));
      saved.forEach((r) => map.set(`${r.assetId}|${r.day}`, r));
      return [...map.values()];
    });
    return saved;
  }, []);

  const byAsset = useMemo(() => {
    const map = new Map<string, Record<string, AssetDay>>();
    items.forEach((r) => {
      const cur = map.get(r.assetId) ?? {};
      cur[r.day.slice(0, 10)] = r;
      map.set(r.assetId, cur);
    });
    return map;
  }, [items]);

  return { items, byAsset, loading, reload, save };
};
