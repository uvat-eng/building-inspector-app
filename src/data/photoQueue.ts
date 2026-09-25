import { useCallback, useEffect, useState } from 'react';

const DB_NAME = 'gsi-photos';
const STORE = 'queue';
const EVENT = 'gsi-photos-changed';
const API = 'https://functions.poehali.dev/26fd0e42-bb64-4022-acb0-097508981039';

export interface QueuedPhoto {
  id: string;
  inspectionId: string;
  defectId: string;
  dataUrl: string;
  createdAt: string;
  sent: boolean;
  url?: string;
  target?: 'defect' | 'folder';
}

const FOLDERS_API = 'https://functions.poehali.dev/99297b13-e7b3-4f26-a80c-d3ec99913480';

const openDb = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE))
        req.result.createObjectStore(STORE, { keyPath: 'id' });
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

export const compressPhoto = (file: File, maxSide = 1280, quality = 0.62) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('no_canvas'));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = String(reader.result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export const queuePhoto = async (
  inspectionId: string,
  defectId: string,
  file: File,
  target: 'defect' | 'folder' = 'defect',
) => {
  const dataUrl = await compressPhoto(file);
  const photo: QueuedPhoto = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    inspectionId,
    defectId,
    dataUrl,
    createdAt: new Date().toISOString(),
    sent: false,
    target,
  };
  await tx('readwrite', (s) => s.put(photo));
  window.dispatchEvent(new Event(EVENT));
  return photo;
};

export const listPhotos = () => tx<QueuedPhoto[]>('readonly', (s) => s.getAll());

export const dropPhoto = async (id: string) => {
  await tx('readwrite', (s) => s.delete(id));
  window.dispatchEvent(new Event(EVENT));
};

interface NetInfo {
  type?: string;
  effectiveType?: string;
  saveData?: boolean;
}

export const netInfo = (): NetInfo =>
  (navigator as unknown as { connection?: NetInfo }).connection ?? {};

export const isWifi = () => {
  const c = netInfo();
  if (!navigator.onLine) return false;
  if (!c.type && !c.effectiveType) return true;
  if (c.type) return c.type === 'wifi' || c.type === 'ethernet';
  return c.effectiveType === '4g' && !c.saveData;
};

export const flushQueue = async (force = false) => {
  if (!navigator.onLine) return { sent: 0, left: 0 };
  if (!force && !isWifi()) {
    const all = await listPhotos();
    return { sent: 0, left: all.filter((p) => !p.sent).length };
  }
  const all = await listPhotos();
  const pending = all.filter((p) => !p.sent);
  let sent = 0;
  for (const p of pending) {
    try {
      const folder = p.target === 'folder';
      const res = await fetch(`${folder ? FOLDERS_API : API}?action=photo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          folder
            ? { action: 'photo', folderId: p.defectId, content: p.dataUrl }
            : {
                action: 'photo',
                inspectionId: p.inspectionId,
                defectId: p.defectId,
                content: p.dataUrl,
              },
        ),
      });
      if (!res.ok) continue;
      const { url } = (await res.json()) as { url: string };
      await tx('readwrite', (s) => s.put({ ...p, sent: true, url }));
      sent += 1;
    } catch {
      // Связь пропала — остальные снимки ждут следующей попытки.
      if (!navigator.onLine) break;
      // Сбой на одном снимке не должен останавливать отправку остальных.
      continue;
    }
  }
  window.dispatchEvent(new Event(EVENT));
  return { sent, left: pending.length - sent };
};

export const usePhotoQueue = (inspectionId?: string) => {
  const [photos, setPhotos] = useState<QueuedPhoto[]>([]);

  const refresh = useCallback(async () => {
    try {
      const all = await listPhotos();
      setPhotos(inspectionId ? all.filter((p) => p.inspectionId === inspectionId) : all);
    } catch {
      /* хранилище недоступно */
    }
  }, [inspectionId]);

  useEffect(() => {
    refresh();
    window.addEventListener(EVENT, refresh);
    window.addEventListener('online', refresh);
    return () => {
      window.removeEventListener(EVENT, refresh);
      window.removeEventListener('online', refresh);
    };
  }, [refresh]);

  const pending = photos.filter((p) => !p.sent).length;
  return { photos, pending, refresh };
};

export const startAutoFlush = () => {
  const run = () => flushQueue().catch(() => undefined);
  window.addEventListener('online', run);
  const timer = window.setInterval(run, 60000);
  run();
  return () => {
    window.removeEventListener('online', run);
    window.clearInterval(timer);
  };
};