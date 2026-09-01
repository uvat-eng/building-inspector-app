import { useCallback, useEffect, useState } from 'react';

export type DocSection = 'project' | 'working' | 'masterplan' | 'contract' | 'pos' | 'ppr';

export interface ProjectDoc {
  id: string;
  objectId: string;
  section: DocSection;
  title: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mime: string;
  note: string;
  uploadedBy: string;
  createdAt: string;
}

export const SECTION_LABEL: Record<DocSection, string> = {
  project: 'Проектная документация',
  working: 'Рабочая документация',
  masterplan: 'Генплан объекта',
  contract: 'Договор строительства',
  pos: 'ПОС — проект организации строительства',
  ppr: 'ППР — проект производства работ',
};

export const SECTION_ICON: Record<DocSection, string> = {
  project: 'FileText',
  working: 'FileCog',
  masterplan: 'Map',
  contract: 'FileBadge',
  pos: 'BookMarked',
  ppr: 'ClipboardList',
};

const API = 'https://functions.poehali.dev/aa8211f2-9533-4dd9-8004-3aa1a408b61a';
const CACHE = 'gsi-docs-cache-v1';
const EVENT = 'gsi-docs-changed';

export const fmtSize = (b: number) => {
  if (!b) return '—';
  if (b >= 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1).replace('.', ',')} МБ`;
  if (b >= 1024) return `${Math.round(b / 1024)} КБ`;
  return `${b} Б`;
};

const readCache = (): Record<string, ProjectDoc[]> => {
  try {
    return JSON.parse(localStorage.getItem(CACHE) || '{}');
  } catch {
    return {};
  }
};

const writeCache = (objectId: string, items: ProjectDoc[]) => {
  const all = readCache();
  all[objectId] = items;
  try {
    localStorage.setItem(CACHE, JSON.stringify(all));
  } catch {
    /* переполнение не критично */
  }
  window.dispatchEvent(new Event(EVENT));
};

export const fileToBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export const useDocuments = (objectId: string) => {
  const [items, setItems] = useState<ProjectDoc[]>(() => readCache()[objectId] ?? []);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const reload = useCallback(async () => {
    const res = await fetch(`${API}?object_id=${encodeURIComponent(objectId)}`);
    if (!res.ok) throw new Error('load_failed');
    const { items: list } = (await res.json()) as { items: ProjectDoc[] };
    writeCache(objectId, list);
    setItems(list);
    return list;
  }, [objectId]);

  useEffect(() => {
    const sync = () => setItems(readCache()[objectId] ?? []);
    window.addEventListener(EVENT, sync);
    setItems(readCache()[objectId] ?? []);
    setLoading(true);
    reload()
      .catch(() => undefined)
      .finally(() => setLoading(false));
    return () => window.removeEventListener(EVENT, sync);
  }, [objectId, reload]);

  const upload = useCallback(
    async (file: File, section: DocSection, meta: { title?: string; note?: string; by?: string }) => {
      setUploading(true);
      try {
        const content = await fileToBase64(file);
        const res = await fetch(API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            objectId,
            section,
            fileName: file.name,
            mime: file.type || 'application/octet-stream',
            title: meta.title || file.name,
            note: meta.note || '',
            uploadedBy: meta.by || '',
            content,
          }),
        });
        if (!res.ok) throw new Error('upload_failed');
        const { item } = (await res.json()) as { item: ProjectDoc };
        const next = [item, ...readCache()[objectId] ?? []];
        writeCache(objectId, next);
        setItems(next);
        return item;
      } finally {
        setUploading(false);
      }
    },
    [objectId],
  );

  const remove = useCallback(
    async (id: string) => {
      const next = (readCache()[objectId] ?? []).filter((d) => d.id !== id);
      writeCache(objectId, next);
      setItems(next);
      await fetch(`${API}?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    },
    [objectId],
  );

  return { items, loading, uploading, upload, remove, reload };
};