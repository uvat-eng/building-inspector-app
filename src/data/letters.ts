import { useCallback, useEffect, useState } from 'react';
import { compressPhoto } from '@/data/photoQueue';

const API = 'https://functions.poehali.dev/7afd97ca-a9ce-4882-9fe7-5804e9a3e717';
const EVENT = 'gsi-letters-changed';

export type LetterKind = 'letter' | 'protocol';
export type PointStatus = 'open' | 'work' | 'done' | 'canceled';

export interface CustLetter {
  id: string;
  kind: LetterKind;
  number: string;
  letterDate: string;
  ym: string;
  sender: string;
  subject: string;
  objectId: string;
  fieldKey: string;
  note: string;
  fileUrl: string;
  fileName: string;
  dueAt: string;
  author: string;
  createdAt: string;
}

export interface CustReply {
  id: string;
  letterId: string;
  number: string;
  replyDate: string;
  subject: string;
  note: string;
  fileUrl: string;
  fileName: string;
  author: string;
  createdAt: string;
}

export interface CustPoint {
  id: string;
  letterId: string;
  num: string;
  text: string;
  responsible: string;
  dueAt: string;
  status: PointStatus;
  statusNote: string;
  statusBy: string;
  statusAt: string;
  createdAt: string;
}

export const STATUS_LABEL: Record<PointStatus, string> = {
  open: 'Не начат',
  work: 'В работе',
  done: 'Выполнен',
  canceled: 'Снят',
};

export const STATUS_TONE: Record<PointStatus, string> = {
  open: 'border-destructive text-destructive',
  work: 'border-accent text-accent',
  done: 'border-emerald-600 text-emerald-600',
  canceled: 'border-border text-muted-foreground',
};

export const STATUS_ORDER: PointStatus[] = ['open', 'work', 'done', 'canceled'];

export const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

export const ymTitle = (ym: string) => {
  const [y, m] = ym.split('-');
  const idx = Number(m) - 1;
  return MONTHS[idx] ? `${MONTHS[idx]} ${y}` : ym || 'Без даты';
};

export const ruDate = (v?: string) => {
  if (!v) return '';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString('ru');
};

export const useLetters = () => {
  const [letters, setLetters] = useState<CustLetter[]>([]);
  const [replies, setReplies] = useState<CustReply[]>([]);
  const [points, setPoints] = useState<CustPoint[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(API);
      if (!r.ok) throw new Error('load_failed');
      const d = (await r.json()) as {
        letters: CustLetter[];
        replies: CustReply[];
        points: CustPoint[];
      };
      setLetters(d.letters ?? []);
      setReplies(d.replies ?? []);
      setPoints(d.points ?? []);
    } catch {
      /* оффлайн — показываем прежние данные */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
    const h = () => reload();
    window.addEventListener(EVENT, h);
    return () => window.removeEventListener(EVENT, h);
  }, [reload]);

  return { letters, replies, points, loading, reload };
};

const ping = () => window.dispatchEvent(new Event(EVENT));

type NewLetter = Partial<CustLetter> & {
  content?: string;
  mime?: string;
  points?: { num: string; text: string; responsible?: string; dueAt?: string }[];
};

export const createLetter = async (kind: LetterKind, l: NewLetter) => {
  const r = await fetch(`${API}?kind=${kind}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...l, kind }),
  });
  if (!r.ok) throw new Error('create_failed');
  ping();
  return ((await r.json()) as { item: CustLetter }).item;
};

export const createReply = async (
  x: Partial<CustReply> & { content?: string; mime?: string },
) => {
  const r = await fetch(`${API}?kind=reply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...x, kind: 'reply' }),
  });
  if (!r.ok) throw new Error('create_failed');
  ping();
  return ((await r.json()) as { item: CustReply }).item;
};

export const createPoint = async (x: Partial<CustPoint>) => {
  const r = await fetch(`${API}?kind=point`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...x, kind: 'point' }),
  });
  if (!r.ok) throw new Error('create_failed');
  ping();
  return ((await r.json()) as { item: CustPoint }).item;
};

export const patchPoint = async (id: string, patch: Partial<CustPoint>) => {
  const r = await fetch(`${API}?kind=point`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, patch, kind: 'point' }),
  });
  if (!r.ok) throw new Error('update_failed');
  ping();
};

export const removeItem = async (kind: 'letter' | 'reply' | 'point', id: string) => {
  const r = await fetch(`${API}?kind=${kind}&id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  if (!r.ok) throw new Error('delete_failed');
  ping();
};

export const readFile = (file: File) => {
  if (file.type.startsWith('image/')) return compressPhoto(file);
  return new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(new Error('read_failed'));
    fr.readAsDataURL(file);
  });
};