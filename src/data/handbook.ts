import { useCallback, useEffect, useState } from 'react';

const NORMS_API = 'https://functions.poehali.dev/b9b1a996-8cf5-4866-aae2-e1589553e231';

export interface BookItem {
  text: string;
  ref: string;
  kind: string;
}

export interface BookKind {
  kind: string;
  count: number;
}

export interface BookPage {
  total: number;
  found: number;
  page: number;
  size: number;
  kinds: BookKind[];
  items: BookItem[];
}

const EMPTY: BookPage = {
  total: 0,
  found: 0,
  page: 1,
  size: 50,
  kinds: [],
  items: [],
};

export const useHandbook = (kind: string, query: string, page: number, size = 50) => {
  const [data, setData] = useState<BookPage>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchPage = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const r = await fetch(NORMS_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'handbook', kind, q: query, page, size }),
      });
      if (!r.ok) throw new Error('bad_status');
      setData((await r.json()) as BookPage);
    } catch {
      setError('Не удалось загрузить справочник');
    } finally {
      setLoading(false);
    }
  }, [kind, query, page, size]);

  useEffect(() => {
    const t = setTimeout(fetchPage, query ? 350 : 0);
    return () => clearTimeout(t);
  }, [fetchPage, query]);

  return { data, loading, error, reload: fetchPage };
};

export const KIND_ICON: Record<string, string> = {
  'Общестроительные работы': 'Building2',
  'Охрана труда и промбезопасность': 'HardHat',
  'Фундаменты и основания (в т.ч. ростверки)': 'Layers',
  'Исполнительная документация': 'FileCheck',
  'Сварочные работы на трубопроводах': 'Flame',
  'Сборка металлоконструкций и прочие монтажные работы': 'Wrench',
  Резервуары: 'Cylinder',
  'Слаботочные системы, системы связи, КИП': 'Radio',
  'Электротехнические работы': 'Zap',
  'Неразрушающий контроль': 'ScanLine',
  'Охрана окружающей среды': 'Leaf',
  'Пожарная безопасность': 'FlameKindling',
  'Транспортная безопасность': 'Truck',
  'Сварочные работы на металлоконструкциях': 'Blocks',
  Прочее: 'Circle',
};
