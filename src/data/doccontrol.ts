import { useCallback, useEffect, useState } from 'react';

const API = 'https://functions.poehali.dev/b81b393e-a9c7-49a6-8d9f-0bea1d076347';

export const DOC_FILE_KINDS = [
  { id: 'itd', label: 'Отчёт и журнал о проверке ИТД' },
  { id: 'itd_report', label: 'Отчёт по проверке ИТД' },
  { id: 'psd', label: 'Таблица проверки ПСД подрядчиков' },
  { id: 'other', label: 'Прочий документ' },
] as const;

export const kindLabel = (id: string) =>
  DOC_FILE_KINDS.find((k) => k.id === id)?.label ?? 'Документ';

export interface DocCheck {
  id: string;
  contractor: string;
  objectTitle: string;
  section: string;
  folder: string;
  repNtn: string;
  planned: number;
  archived: number;
  certs: number;
  sent1: number;
  back1: number;
  issued1: number;
  date1: string;
  sent2: number;
  back2: number;
  open2: number;
  issued2: number;
  date2: string;
  authorId: string;
  authorFio: string;
  createdAt: string;
}

export interface DocDefect {
  id: string;
  checkId: string;
  date: string;
  contractor: string;
  objectTitle: string;
  position: string;
  content: string;
  recordedBy: string;
  ackBy: string;
  fixStatus: string;
  fixDate: string;
  authorId: string;
  authorFio: string;
  createdAt: string;
}

export interface DocFile {
  id: string;
  contractor: string;
  kind: string;
  title: string;
  fileName: string;
  url: string;
  sizeKb: number;
  note: string;
  uploadedBy: string;
  createdAt: string;
}

export const isDocFixed = (s?: string) => (s ?? '').toLowerCase().startsWith('устранен');

export const useDocControl = () => {
  const [checks, setChecks] = useState<DocCheck[]>([]);
  const [defects, setDefects] = useState<DocDefect[]>([]);
  const [files, setFiles] = useState<DocFile[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const res = await fetch(API);
    if (!res.ok) throw new Error('load_failed');
    const d = (await res.json()) as {
      checks: DocCheck[];
      defects: DocDefect[];
      files: DocFile[];
    };
    setChecks(d.checks ?? []);
    setDefects(d.defects ?? []);
    setFiles(d.files ?? []);
  }, []);

  useEffect(() => {
    setLoading(true);
    reload()
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [reload]);

  const post = async <T,>(kind: string, payload: Record<string, unknown>) => {
    const res = await fetch(`${API}?kind=${kind}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, ...payload }),
    });
    if (!res.ok) throw new Error('save_failed');
    const { item } = (await res.json()) as { item: T };
    return item;
  };

  const addCheck = useCallback(async (data: Partial<DocCheck>) => {
    const item = await post<DocCheck>('check', data);
    setChecks((p) => [item, ...p]);
    return item;
  }, []);

  const addDefect = useCallback(async (data: Partial<DocDefect>) => {
    const item = await post<DocDefect>('defect', data);
    setDefects((p) => [item, ...p]);
    return item;
  }, []);

  const updateCheck = useCallback(async (id: string, patch: Partial<DocCheck>) => {
    const res = await fetch(`${API}?kind=check`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'check', id, ...patch }),
    });
    if (!res.ok) throw new Error('update_failed');
    const { item } = (await res.json()) as { item: DocCheck };
    setChecks((p) => p.map((r) => (r.id === id ? item : r)));
    return item;
  }, []);

  const updateDefect = useCallback(async (id: string, patch: Partial<DocDefect>) => {
    const res = await fetch(`${API}?kind=defect`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'defect', id, ...patch }),
    });
    if (!res.ok) throw new Error('update_failed');
    const { item } = (await res.json()) as { item: DocDefect };
    setDefects((p) => p.map((r) => (r.id === id ? item : r)));
    return item;
  }, []);

  const uploadFile = useCallback(
    async (file: File, meta: { contractor: string; kind: string; note: string; by: string }) => {
      const buf = await file.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let bin = '';
      bytes.forEach((b) => {
        bin += String.fromCharCode(b);
      });
      const item = await post<DocFile>('upload', {
        fileName: file.name,
        fileBase64: btoa(bin),
        mime: file.type,
        title: file.name.replace(/\.[^.]+$/, ''),
        contractor: meta.contractor,
        kind: meta.kind,
        note: meta.note,
        uploadedBy: meta.by,
      });
      setFiles((p) => [item, ...p]);
      return item;
    },
    [],
  );

  const removeItem = useCallback(async (kind: 'check' | 'defect' | 'file', id: string) => {
    if (kind === 'check') setChecks((p) => p.filter((r) => r.id !== id));
    if (kind === 'defect') setDefects((p) => p.filter((r) => r.id !== id));
    if (kind === 'file') setFiles((p) => p.filter((r) => r.id !== id));
    await fetch(`${API}?kind=${kind}&id=${encodeURIComponent(id)}`, { method: 'DELETE' });
  }, []);

  return {
    checks,
    defects,
    files,
    loading,
    reload,
    addCheck,
    addDefect,
    updateCheck,
    updateDefect,
    uploadFile,
    removeItem,
  };
};

export interface ContractorStat {
  contractor: string;
  planned: number;
  archived: number;
  certs: number;
  sent1: number;
  back1: number;
  issued: number;
  fixed: number;
  open: number;
  files: number;
}

export const contractorStats = (
  checks: DocCheck[],
  defects: DocDefect[],
  files: DocFile[],
): ContractorStat[] => {
  const names = [
    ...new Set([
      ...checks.map((c) => c.contractor),
      ...defects.map((d) => d.contractor),
      ...files.map((f) => f.contractor),
    ]),
  ].filter(Boolean);

  return names.map((name) => {
    const cs = checks.filter((c) => c.contractor === name);
    const ds = defects.filter((d) => d.contractor === name);
    const sum = (k: keyof DocCheck) => cs.reduce((a, c) => a + (Number(c[k]) || 0), 0);
    return {
      contractor: name,
      planned: sum('planned'),
      archived: sum('archived'),
      certs: sum('certs'),
      sent1: sum('sent1'),
      back1: sum('back1'),
      issued: sum('issued1') + sum('issued2') + ds.length,
      fixed: ds.filter((d) => isDocFixed(d.fixStatus)).length,
      open: ds.filter((d) => !isDocFixed(d.fixStatus)).length,
      files: files.filter((f) => f.contractor === name).length,
    };
  });
};
