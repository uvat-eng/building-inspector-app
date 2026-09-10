import { useCallback, useEffect, useState } from 'react';

const API = 'https://functions.poehali.dev/2e05053b-09c0-417d-977e-345974ee080d';

export type AuditKind = 'project' | 'executive';
export type NoteScope = 'norms' | 'ctrl';

export interface AuditNote {
  id: string;
  scope: NoteScope;
  num: number;
  severity: string;
  section: string;
  text: string;
  norm: string;
  quote: string;
  demand: string;
}

export interface AuditFile {
  id: string;
  name: string;
  url: string;
  sizeKb: number;
  pages: number;
}

export interface DocReview {
  id: string;
  kind: AuditKind;
  objectId: string;
  objectName: string;
  title: string;
  inspector: string;
  status: 'new' | 'done' | 'error';
  filesCount: number;
  pagesCount: number;
  verdict: string;
  ctrlVerdict: string;
  ctrlScore: number;
  completeNote: string;
  engine: string;
  error: string;
  ocrPages?: number;
  createdAt: string;
  checkedAt: string | null;
}

export const ENGINE_LABEL: Record<string, string> = {
  cloudru: 'GigaChat 3.5 (Cloud.ru)',
  deepseek: 'DeepSeek',
  gigachat: 'GigaChat (Сбер)',
};

export const SEVERITY_ORDER = ['Критическое', 'Замечание', 'Рекомендация'];

export const severityStyle = (s: string) => {
  if (s.startsWith('Крит')) return 'bg-destructive text-destructive-foreground';
  if (s.startsWith('Реком')) return 'bg-secondary text-secondary-foreground';
  return 'bg-accent text-accent-foreground';
};

const fileToBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error('read_failed'));
    r.readAsDataURL(file);
  });

export const listReviews = async (kind: AuditKind) => {
  const res = await fetch(`${API}?kind=${kind}`);
  const data = (await res.json()) as { items?: DocReview[] };
  return data.items ?? [];
};

export const loadReview = async (id: string) => {
  const res = await fetch(`${API}?action=one&id=${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error('Проверка не найдена');
  return (await res.json()) as {
    item: DocReview;
    notes: AuditNote[];
    files: AuditFile[];
  };
};

export const createReview = async (input: {
  kind: AuditKind;
  objectId?: string;
  objectName: string;
  title: string;
  inspector: string;
}) => {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'create', ...input }),
  });
  const data = (await res.json()) as { id?: string };
  if (!data.id) throw new Error('Не удалось создать проверку');
  return data.id;
};

export const uploadAuditFile = async (reviewId: string, file: File) => {
  const content = await fileToBase64(file);
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'upload',
      reviewId,
      name: file.name,
      mime: file.type,
      content,
    }),
  });
  if (!res.ok) throw new Error(`Не удалось загрузить «${file.name}»`);
  return (await res.json()) as AuditFile & { chars: number };
};

export interface PageStep {
  done: boolean;
  page?: number;
  file?: string;
  method?: 'text' | 'ocr';
  chars?: number;
  donePages?: number;
  totalPages?: number;
}

/** Читает одну страницу за вызов — так укладываемся в лимит времени функции. */
export const readNextPage = async (reviewId: string) => {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'page', reviewId }),
  });
  if (!res.ok) throw new Error('Не удалось прочитать страницу');
  return (await res.json()) as PageStep;
};

/** Прогоняет все страницы по очереди, сообщая о прогрессе. */
export const readAllPages = async (
  reviewId: string,
  onStep: (s: PageStep) => void,
  maxSteps = 400,
) => {
  let chars = 0;
  for (let i = 0; i < maxSteps; i += 1) {
    const step = await readNextPage(reviewId);
    if (step.done) return { chars: step.chars ?? chars };
    chars += step.chars ?? 0;
    onStep(step);
  }
  throw new Error('Слишком много страниц — разбейте документацию на части');
};

export const analyzeReview = async (reviewId: string) => {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'analyze', reviewId }),
  });
  const data = (await res.json()) as {
    ok?: boolean;
    error?: string;
    message?: string;
    engine?: string;
  };
  if (!data.ok) {
    if (data.error === 'no_text') {
      throw new Error(
        'Не удалось прочитать текст: похоже, файлы — сканы без текстового слоя. ' +
          'Загрузите документацию в виде PDF с текстом или DOCX.',
      );
    }
    if (data.error === 'no_files') throw new Error('Сначала загрузите файлы документации');
    throw new Error(data.message || 'ИИ не смог выполнить проверку');
  }
  return data;
};

export const removeReview = async (id: string) => {
  await fetch(`${API}?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
};

export const useReviews = (kind: AuditKind) => {
  const [items, setItems] = useState<DocReview[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    setLoading(true);
    listReviews(kind)
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [kind]);

  useEffect(reload, [reload]);

  return { items, loading, reload };
};

/** Архив по объектам: группировка проверок по названию объекта. */
export const groupByObject = (items: DocReview[]) => {
  const map = new Map<string, DocReview[]>();
  items.forEach((it) => {
    const key = it.objectName.trim() || 'Без объекта';
    map.set(key, [...(map.get(key) ?? []), it]);
  });
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], 'ru'));
};

export const fmtDate = (v: string | null) => {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
};