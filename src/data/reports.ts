import { useCallback, useEffect, useState } from 'react';

const API = 'https://functions.poehali.dev/62fd56b2-9c88-45e6-b008-cffa2d289935';

export const NATURE = [
  'ОТ и ПБ',
  'Технология и качество',
  'Документация',
] as const;

export const CATEGORIES = [
  'ОТ и ТБ',
  'Аттестация персонала',
  'Разрешительная документация',
  'Исполнительная документация',
  'Складирование и транспортировка',
  'Входной контроль',
  'Общестроительные работы',
  'Сборка и сварка',
  'Электромонтажные работы',
  'Оборудование и инструмент',
  'Отступления от проектных решений / Согласование',
] as const;

export type Nature = (typeof NATURE)[number];
export type Category = (typeof CATEGORIES)[number];

export interface ReportRow {
  id: string;
  contractor: string;
  point: number;
  content: string;
  normRef: string;
  docRef: string;
  place: string;
  orderNo: string;
  issuedAt: string;
  dueAt: string;
  factAt: string;
  extension: string;
  status: 'Устранено' | 'Не устранено';
  responsible: string;
  inspector: string;
  stopWork: boolean;
  nature: Nature | '';
  category: Category | '';
  photos?: string[];
}

export interface DailyReport {
  id: string;
  objectId: string;
  date: string;
  author: string;
  note: string;
  rows: ReportRow[];
  fileUrl?: string;
  fileName?: string;
  createdAt: string;
  updatedAt: string;
}

export const EMPTY_ROW: Omit<ReportRow, 'id'> = {
  contractor: '',
  point: 1,
  content: '',
  normRef: '',
  docRef: '',
  place: '',
  orderNo: '',
  issuedAt: '',
  dueAt: '',
  factAt: '',
  extension: '',
  status: 'Не устранено',
  responsible: '',
  inspector: '',
  stopWork: false,
  nature: '',
  category: '',
  photos: [],
};

export const rid = () => Math.random().toString(36).slice(2, 10);

const toBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export const IMPORT_ERRORS: Record<string, string> = {
  no_rows_found: 'В файле не найдено ни одной строки предписания',
  date_not_found: 'Не удалось определить дату отчёта в файле',
  file_and_object_required: 'Файл не передан',
};

export const importReportFile = async (objectId: string, file: File) => {
  const content = await toBase64(file);
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind: 'import', objectId, fileName: file.name, content }),
  });
  const data = (await res.json()) as { item?: DailyReport; error?: string };
  if (!res.ok || !data.item) {
    throw new Error(IMPORT_ERRORS[data.error ?? ''] ?? 'Не удалось разобрать файл');
  }
  return data.item;
};

export const uploadReportPhoto = async (objectId: string, file: File) => {
  const content = await toBase64(file);
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      kind: 'photo',
      objectId,
      fileName: file.name,
      mime: file.type,
      content,
    }),
  });
  if (!res.ok) throw new Error('upload_failed');
  const { url } = (await res.json()) as { url: string };
  return url;
};

export interface RowStats {
  issued: number;
  stop: number;
  noStop: number;
  fixed: number;
  inTime: number;
  late: number;
  open: number;
  overdue: number;
  openStop: number;
}

export const statsOf = (rows: ReportRow[], today = new Date()): RowStats => {
  const s: RowStats = {
    issued: 0,
    stop: 0,
    noStop: 0,
    fixed: 0,
    inTime: 0,
    late: 0,
    open: 0,
    overdue: 0,
    openStop: 0,
  };
  rows.forEach((r) => {
    s.issued += 1;
    if (r.stopWork) s.stop += 1;
    else s.noStop += 1;
    if (r.status === 'Устранено') {
      s.fixed += 1;
      if (r.factAt && r.dueAt && new Date(r.factAt) > new Date(r.dueAt)) s.late += 1;
      else s.inTime += 1;
    } else {
      s.open += 1;
      if (r.dueAt && new Date(r.dueAt) < today) s.overdue += 1;
      if (r.stopWork) s.openStop += 1;
    }
  });
  return s;
};

export interface ArchiveRow extends ReportRow {
  lastDate: string;
  seen: number;
}

const archiveKey = (r: ReportRow) =>
  [r.orderNo.trim().toLowerCase(), r.point, r.content.trim().slice(0, 80).toLowerCase()].join('|');

export const buildArchive = (reports: DailyReport[]): ArchiveRow[] => {
  const map = new Map<string, ArchiveRow>();
  reports
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach((rep) => {
      rep.rows.forEach((row) => {
        const key = archiveKey(row);
        const prev = map.get(key);
        map.set(key, {
          ...row,
          photos: [...(prev?.photos ?? []), ...(row.photos ?? [])].filter(
            (u, i, a) => a.indexOf(u) === i,
          ),
          lastDate: rep.date,
          seen: (prev?.seen ?? 0) + 1,
        });
      });
    });
  return [...map.values()].sort((a, b) => b.lastDate.localeCompare(a.lastDate));
};

export const byContractor = (rows: ReportRow[]) => {
  const m = new Map<string, ReportRow[]>();
  rows.forEach((r) => {
    const key = r.contractor.trim() || 'Без подрядчика';
    m.set(key, [...(m.get(key) ?? []), r]);
  });
  return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0], 'ru'));
};

export const useReports = (objectId: string) => {
  const [items, setItems] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!objectId) return [];
    const res = await fetch(`${API}?object_id=${encodeURIComponent(objectId)}`);
    if (!res.ok) throw new Error('load_failed');
    const { items: list } = (await res.json()) as { items: DailyReport[] };
    setItems(list ?? []);
    return list ?? [];
  }, [objectId]);

  useEffect(() => {
    setLoading(true);
    reload()
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [reload]);

  const save = useCallback(
    async (data: Partial<DailyReport> & { date: string }) => {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ objectId, ...data }),
      });
      if (!res.ok) throw new Error('save_failed');
      const { item } = (await res.json()) as { item: DailyReport };
      await reload();
      return item;
    },
    [objectId, reload],
  );

  const remove = useCallback(
    async (id: string) => {
      await fetch(API, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      await reload();
    },
    [reload],
  );

  return { items, loading, save, remove, reload };
};