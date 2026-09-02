import { useCallback, useEffect, useState } from 'react';

export type ModuleId = 'customer' | 'sk' | 'contractor' | 'subcontractor';

export interface ModuleDef {
  id: ModuleId;
  title: string;
  short: string;
  icon: string;
  note: string;
  ready: boolean;
}

export const MODULES: ModuleDef[] = [
  {
    id: 'customer',
    title: 'Заказчик',
    short: 'Заказчик',
    icon: 'Landmark',
    note: 'Контроль хода работ, приёмка объектов и отчётность подрядчиков',
    ready: false,
  },
  {
    id: 'sk',
    title: 'Исполнитель СК',
    short: 'Строительный контроль',
    icon: 'ShieldCheck',
    note: 'Инспекции, замечания, предписания, фотофиксация и табель бригады',
    ready: true,
  },
  {
    id: 'contractor',
    title: 'Подрядчик по строительству',
    short: 'Подрядчик',
    icon: 'HardHat',
    note: 'Выполнение работ, исполнительная документация и устранение замечаний',
    ready: false,
  },
  {
    id: 'subcontractor',
    title: 'Субподрядчик по строительству',
    short: 'Субподрядчик',
    icon: 'Wrench',
    note: 'Работы по договору с генподрядчиком и сдача скрытых работ',
    ready: false,
  },
];

export const moduleById = (id: string) => MODULES.find((m) => m.id === id);

const KEY = 'gsi-module-v1';
const EVENT = 'gsi-module-changed';

export const useModule = () => {
  const [module, setModule] = useState<ModuleId | null>(
    () => (localStorage.getItem(KEY) as ModuleId) || null,
  );

  useEffect(() => {
    const sync = () => setModule((localStorage.getItem(KEY) as ModuleId) || null);
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const pick = useCallback((id: ModuleId | null) => {
    if (id) localStorage.setItem(KEY, id);
    else localStorage.removeItem(KEY);
    window.dispatchEvent(new Event(EVENT));
  }, []);

  return { module, pick };
};
