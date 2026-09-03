import { useCallback, useEffect, useState } from 'react';

const API = 'https://functions.poehali.dev/99297b13-e7b3-4f26-a80c-d3ec99913480';

export type FolderSection = 'tests' | 'ks' | 'incoming' | 'photoreport';

export interface FolderPhoto {
  id: string;
  url: string;
}

export interface PhotoFolder {
  id: string;
  objectId: string;
  section: FolderSection;
  subsection: string;
  title: string;
  note: string;
  month: string;
  createdBy: string;
  createdAt: string;
  photos: FolderPhoto[];
}

export const SECTION_TITLE: Record<FolderSection, string> = {
  tests: 'Подписанные акты испытаний и иные важные документы',
  ks: 'Подписанные акты ф. КС-2, КС-3, КС-6, КС-11',
  incoming: 'Входной контроль',
  photoreport: 'Фотоотчёты',
};

export const MONTHS = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
];

export const monthKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

export const monthLabel = (key: string) => {
  const [y, m] = key.split('-');
  const idx = Number(m) - 1;
  return MONTHS[idx] ? `${MONTHS[idx]} ${y}` : key;
};

export const monthsForYear = (year: number) =>
  MONTHS.map((_, i) => `${year}-${String(i + 1).padStart(2, '0')}`);

export const SUBSECTIONS: Record<FolderSection, { id: string; label: string; icon: string }[]> = {
  tests: [],
  ks: [],
  incoming: [
    { id: 'acts', label: 'Акты входного контроля', icon: 'ClipboardCheck' },
    { id: 'm19', label: 'Акты М-19, М-29', icon: 'FileSpreadsheet' },
  ],
  photoreport: [],
};

export const useAllFolders = (section: FolderSection) => {
  const [items, setItems] = useState<PhotoFolder[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const res = await fetch(`${API}?section=${encodeURIComponent(section)}`);
    if (!res.ok) throw new Error('load_failed');
    const { items: list } = (await res.json()) as { items: PhotoFolder[] };
    setItems(list ?? []);
    return list ?? [];
  }, [section]);

  useEffect(() => {
    setLoading(true);
    reload()
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [reload]);

  const create = useCallback(
    async (data: {
      objectId: string;
      title: string;
      note?: string;
      createdBy?: string;
      month?: string;
      subsection?: string;
    }) => {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section, ...data }),
      });
      if (!res.ok) throw new Error('create_failed');
      const { item } = (await res.json()) as { item: PhotoFolder };
      setItems((p) => [item, ...p]);
      return item;
    },
    [section],
  );

  const remove = useCallback(async (id: string) => {
    setItems((p) => p.filter((f) => f.id !== id));
    await fetch(`${API}?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
  }, []);

  const removePhoto = useCallback(async (folderId: string, photoId: string) => {
    setItems((p) =>
      p.map((f) =>
        f.id === folderId ? { ...f, photos: f.photos.filter((ph) => ph.id !== photoId) } : f,
      ),
    );
    await fetch(`${API}?photo_id=${encodeURIComponent(photoId)}`, { method: 'DELETE' });
  }, []);

  return { items, loading, create, remove, removePhoto, reload };
};

export const uploadFolderPhoto = async (folderId: string, dataUrl: string) => {
  const res = await fetch(`${API}?action=photo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'photo', folderId, content: dataUrl }),
  });
  if (!res.ok) throw new Error('upload_failed');
  return (await res.json()) as FolderPhoto;
};

export const useFolders = (objectId: string, section: FolderSection) => {
  const [items, setItems] = useState<PhotoFolder[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const res = await fetch(
      `${API}?object_id=${encodeURIComponent(objectId)}&section=${encodeURIComponent(section)}`,
    );
    if (!res.ok) throw new Error('load_failed');
    const { items: list } = (await res.json()) as { items: PhotoFolder[] };
    setItems(list ?? []);
    return list ?? [];
  }, [objectId, section]);

  useEffect(() => {
    setLoading(true);
    reload()
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [reload]);

  const create = useCallback(
    async (title: string, subsection = '', note = '', createdBy = '', month = '') => {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ objectId, section, subsection, title, note, createdBy, month }),
      });
      if (!res.ok) throw new Error('create_failed');
      const { item } = (await res.json()) as { item: PhotoFolder };
      setItems((p) => [item, ...p]);
      return item;
    },
    [objectId, section],
  );

  const rename = useCallback(async (id: string, title: string) => {
    setItems((p) => p.map((f) => (f.id === id ? { ...f, title } : f)));
    await fetch(API, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, patch: { title } }),
    });
  }, []);

  const remove = useCallback(async (id: string) => {
    setItems((p) => p.filter((f) => f.id !== id));
    await fetch(`${API}?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
  }, []);

  const removePhoto = useCallback(async (folderId: string, photoId: string) => {
    setItems((p) =>
      p.map((f) =>
        f.id === folderId ? { ...f, photos: f.photos.filter((ph) => ph.id !== photoId) } : f,
      ),
    );
    await fetch(`${API}?photo_id=${encodeURIComponent(photoId)}`, { method: 'DELETE' });
  }, []);

  return { items, loading, create, rename, remove, removePhoto, reload };
};