import { useCallback, useEffect, useState } from 'react';

const API = 'https://functions.poehali.dev/c3c85ac4-e95e-46b5-96c9-3830da83c56e';

export interface ShiftInfo {
  start: string;
  end: string;
  workDays: number;
  hours: number;
  moStart: string;
  moEnd: string;
  moDays: number;
  objects: string[];
  open: boolean;
}

export interface InspectorRollup {
  id: string;
  fio: string;
  group: string;
  org: string;
  phone: string;
  monthDays: number;
  monthHours: number;
  monthMO: number;
  shift: ShiftInfo | null;
  shifts: ShiftInfo[];
  inspections: number;
  defects: number;
  orders: number;
  docFolders: number;
  lastActivity: string;
  onShift: boolean;
}

export interface ObjectRollup {
  objectId: string;
  inspections: number;
  defects: number;
  orders: number;
  folders: number;
  inspectors: number;
  lastActivity: string;
}

export interface ArchiveRow {
  userId: string;
  fio: string;
  group: string;
  lastDate: string;
  snapshots: number;
}

const ARCHIVE_KEY = 'gsi-archive-run-v1';

export const runDailyArchive = async () => {
  const today = new Date().toISOString().slice(0, 10);
  if (localStorage.getItem(ARCHIVE_KEY) === today) return;
  try {
    await fetch(`${API}?action=archive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    localStorage.setItem(ARCHIVE_KEY, today);
  } catch {
    /* повторим при следующем заходе */
  }
};

export const useInspectorsRollup = (group = '') => {
  const [items, setItems] = useState<InspectorRollup[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const res = await fetch(`${API}?action=inspectors&group=${encodeURIComponent(group)}`);
      const d = (await res.json()) as { items: InspectorRollup[] };
      setItems(d.items ?? []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [group]);

  useEffect(() => {
    setLoading(true);
    reload();
    runDailyArchive();
  }, [reload]);

  return { items, loading, reload };
};

export const useObjectsRollup = () => {
  const [items, setItems] = useState<ObjectRollup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}?action=objects`)
      .then((r) => r.json())
      .then((d: { items: ObjectRollup[] }) => setItems(d.items ?? []))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  return { items, loading };
};

export const useArchiveList = () => {
  const [items, setItems] = useState<ArchiveRow[]>([]);

  useEffect(() => {
    fetch(`${API}?action=archive`)
      .then((r) => r.json())
      .then((d: { items: ArchiveRow[] }) => setItems(d.items ?? []))
      .catch(() => undefined);
  }, []);

  return items;
};

export default useInspectorsRollup;
