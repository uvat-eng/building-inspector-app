import { useCallback, useEffect, useState } from 'react';

export type Role =
  | 'director'
  | 'coordinator'
  | 'pm'
  | 'manager'
  | 'engineer'
  | 'inspector'
  | 'driver';

export const ROLE_ORDER: Role[] = [
  'director',
  'coordinator',
  'pm',
  'manager',
  'engineer',
  'inspector',
  'driver',
];

export const ROLE_LABEL: Record<Role, string> = {
  director: 'Директор',
  coordinator: 'Координатор проекта',
  pm: 'Менеджер проекта',
  manager: 'Руководитель проекта',
  engineer: 'Старший инженер',
  inspector: 'Инспектор СК',
  driver: 'Водитель',
};

export const ROLE_NOTE: Record<Role, string> = {
  director: 'Полный доступ, сводка по всем объектам и подписание документов',
  coordinator: 'Координация работ и графики выездов',
  pm: 'Договоры с заказчиком, месторождения, проекты и объекты — внесение и правка',
  manager: 'Управление объектом, персоналом и техникой',
  engineer: 'Замечания, предписания, проверка исполнительной документации',
  inspector: 'Выезды, фотофиксация и оформление замечаний на объекте',
  driver: 'График выездов и маршруты, доступ только на просмотр',
};

export const ROLE_ICON: Record<Role, string> = {
  director: 'Crown',
  coordinator: 'Network',
  pm: 'FileSignature',
  manager: 'Briefcase',
  engineer: 'Ruler',
  inspector: 'HardHat',
  driver: 'Truck',
};

const CAN_EDIT: Role[] = ['pm'];

export const ROLE_SECTIONS: Record<Role, string[]> = {
  director: [
    'cabinet',
    'objects',
    'staff',
    'sites',
    'inspections',
    'defects',
    'photos',
    'documents',
    'reports',
  ],
  coordinator: [
    'cabinet',
    'objects',
    'staff',
    'sites',
    'inspections',
    'defects',
    'photos',
    'documents',
    'reports',
  ],
  pm: ['cabinet', 'objects', 'sites', 'inspections', 'defects', 'photos', 'documents', 'reports'],
  manager: ['objects', 'sites', 'inspections', 'defects', 'photos', 'documents', 'reports'],
  engineer: ['objects', 'sites', 'defects', 'photos', 'documents', 'reports'],
  inspector: ['cabinet', 'objects', 'sites', 'defects', 'photos', 'documents'],
  driver: ['objects', 'inspections'],
};

export const EDIT_HINT = 'Вносить и изменять месторождения, проекты и объекты может только менеджер проекта.';

export const SPECIALTIES = [
  'Инженер-электрик',
  'Инженер-общестроитель',
  'Инженер КИП и слаботочных систем',
  'Инженер-сварщик',
  'Инженер по НК',
  'Инженер-геодезист',
  'Инженер-маркшейдер',
  'Инженер беспилотных систем',
  'Инженер-энергетик',
  'Супер-мозг всех направлений',
];

export interface Profile {
  fio: string;
  role: Role;
  group: string;
  org: string;
  specialties: string[];
}

const DEFAULT: Profile = {
  fio: '',
  role: 'inspector',
  group: '',
  org: 'ООО «Глобал-Стройинжиниринг»',
  specialties: [],
};

const KEY = 'gsi-profile-v1';
const EVENT = 'gsi-profile-changed';

const read = (): Profile => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULT, ...(JSON.parse(raw) as Profile) } : DEFAULT;
  } catch {
    return DEFAULT;
  }
};

export const useProfile = () => {
  const [profile, setProfile] = useState<Profile>(read);

  useEffect(() => {
    const sync = () => setProfile(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const save = useCallback((p: Partial<Profile>) => {
    localStorage.setItem(KEY, JSON.stringify({ ...read(), ...p }));
    window.dispatchEvent(new Event(EVENT));
  }, []);

  return { profile, save, canAddObject: CAN_EDIT.includes(profile.role) };
};

export const shortFio = (fio: string) => {
  const parts = fio.trim().split(/\s+/);
  if (parts.length < 2) return fio.trim();
  return `${parts[0]} ${parts[1][0]}.${parts[2] ? parts[2][0] + '.' : ''}`;
};