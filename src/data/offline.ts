import { useCallback, useEffect, useState } from 'react';

const DB_NAME = 'gsi-offline';
const STORE = 'docs';
const EVENT = 'gsi-offline-changed';

interface Saved {
  id: string;
  blob: Blob;
  fileName: string;
  mime: string;
  size: number;
  savedAt: string;
}

const openDb = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

const tx = async <T,>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>) => {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const req = run(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
};

export const saveOffline = async (doc: {
  id: string;
  fileUrl: string;
  fileName: string;
  mime: string;
}) => {
  const res = await fetch(doc.fileUrl);
  if (!res.ok) throw new Error('download_failed');
  const blob = await res.blob();
  await tx('readwrite', (s) =>
    s.put({
      id: doc.id,
      blob,
      fileName: doc.fileName,
      mime: doc.mime,
      size: blob.size,
      savedAt: new Date().toISOString(),
    } as Saved),
  );
  window.dispatchEvent(new Event(EVENT));
  return blob.size;
};

export const dropOffline = async (id: string) => {
  await tx('readwrite', (s) => s.delete(id));
  window.dispatchEvent(new Event(EVENT));
};

export const dropAllOffline = async () => {
  await tx('readwrite', (s) => s.clear());
  window.dispatchEvent(new Event(EVENT));
};

export const getOffline = (id: string) => tx<Saved | undefined>('readonly', (s) => s.get(id));

const listAll = () => tx<Saved[]>('readonly', (s) => s.getAll());

export const openOffline = async (id: string) => {
  const rec = await getOffline(id);
  if (!rec) return false;
  const url = URL.createObjectURL(rec.blob);
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  return true;
};

export const downloadOffline = async (id: string) => {
  const rec = await getOffline(id);
  if (!rec) return false;
  const url = URL.createObjectURL(rec.blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = rec.fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return true;
};

export const useOffline = () => {
  const [ids, setIds] = useState<Set<string>>(new Set());
  const [bytes, setBytes] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const all = await listAll();
      setIds(new Set(all.map((r) => r.id)));
      setBytes(all.reduce((s, r) => s + (r.size || 0), 0));
    } catch {
      /* хранилище недоступно */
    }
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener(EVENT, refresh);
    return () => window.removeEventListener(EVENT, refresh);
  }, [refresh]);

  return { ids, bytes, refresh };
};
