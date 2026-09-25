import { useCallback, useEffect, useState } from 'react';
import { ProjectDoc, DocSection, fileToBase64 } from '@/data/documents';

const API = 'https://functions.poehali.dev/aa8211f2-9533-4dd9-8004-3aa1a408b61a';

export interface UploadTask {
  file: File;
  objectId: string;
  section: DocSection;
  note?: string;
  by?: string;
}

export const useAllDocuments = () => {
  const [items, setItems] = useState<ProjectDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const reload = useCallback(async () => {
    const res = await fetch(API);
    if (!res.ok) throw new Error('load_failed');
    const { items: list } = (await res.json()) as { items: ProjectDoc[] };
    setItems(list);
    return list;
  }, []);

  useEffect(() => {
    setLoading(true);
    reload()
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [reload]);

  const uploadMany = useCallback(
    async (tasks: UploadTask[]) => {
      setProgress({ done: 0, total: tasks.length });
      const added: ProjectDoc[] = [];
      let failed = 0;
      for (let i = 0; i < tasks.length; i += 1) {
        const t = tasks[i];
        try {
          const content = await fileToBase64(t.file);
          const res = await fetch(API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              objectId: t.objectId,
              section: t.section,
              fileName: t.file.name,
              mime: t.file.type || 'application/octet-stream',
              title: t.file.name,
              note: t.note || '',
              uploadedBy: t.by || '',
              content,
            }),
          });
          if (!res.ok) throw new Error('upload_failed');
          const { item } = (await res.json()) as { item: ProjectDoc };
          added.push(item);
        } catch {
          failed += 1;
        }
        setProgress({ done: i + 1, total: tasks.length });
      }
      setItems((prev) => [...added, ...prev]);
      setProgress(null);
      return { ok: added.length, failed };
    },
    [],
  );

  const remove = useCallback(async (id: string) => {
    let before: ProjectDoc[] = [];
    setItems((prev) => {
      before = prev;
      return prev.filter((d) => d.id !== id);
    });
    try {
      const res = await fetch(`${API}?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('delete_failed');
    } catch (e) {
      setItems(before);
      throw e;
    }
  }, []);

  return { items, loading, progress, uploadMany, remove, reload };
};