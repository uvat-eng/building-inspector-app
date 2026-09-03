import { useCallback, useEffect, useState } from 'react';

export type Role =
  | 'admin'
  | 'director'
  | 'coordinator'
  | 'pm'
  | 'manager'
  | 'engineer'
  | 'inspector'
  | 'mechanic'
  | 'driver';

export const ROLE_ORDER: Role[] = [
  'admin',
  'director',
  'manager',
  'engineer',
  'inspector',
  'mechanic',
  'driver',
];

export const ROLE_LABEL: Record<Role, string> = {
  admin: 'Администратор системы',
  director: 'Директор',
  coordinator: 'Координатор проекта',
  pm: 'Менеджер проекта',
  manager: 'Руководитель проекта',
  engineer: 'Старший инженер',
  inspector: 'Инспектор СК',
  mechanic: 'Механик',
  driver: 'Водитель',
};

export const ROLE_NOTE: Record<Role, string> = {
  admin: 'Полный доступ ко всем разделам, локациям и учётным записям без ограничений',
  director: 'Полный доступ, сводка по всем объектам и подписание документов',
  coordinator: 'Координация работ и графики выездов',
  pm: 'Договоры с заказчиком, месторождения, проекты и объекты — внесение и правка',
  manager: 'Проекты, объекты, договоры, персонал и техника',
  engineer: 'Замечания, предписания, проверка исполнительной документации',
  inspector: 'Выезды, фотофиксация и оформление замечаний на объекте',
  mechanic: 'Автопарк, техобслуживание, путевые листы и топливо',
  driver: 'График выездов и маршруты, доступ только на просмотр',
};

export const ROLE_ICON: Record<Role, string> = {
  admin: 'ShieldUser',
  director: 'Crown',
  coordinator: 'Network',
  pm: 'FileSignature',
  manager: 'Briefcase',
  engineer: 'Ruler',
  inspector: 'HardHat',
  mechanic: 'Wrench',
  driver: 'Truck',
};

const CAN_EDIT: Role[] = ['admin', 'pm', 'coordinator', 'manager'];

export const CAN_ADD_LOCATION: Role[] = ['admin', 'director', 'pm', 'coordinator', 'manager'];

export const ROLE_SECTIONS: Record<Role, string[]> = {
  admin: [
    'cabinet',
    'objects',
    'staff',
    'assets',
    'sites',
    'inspections',
    'defects',
    'photos',
    'documents',
    'reports',
  ],
  director: [
    'cabinet',
    'objects',
    'staff',
    'assets',
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
    'assets',
    'sites',
    'inspections',
    'defects',
    'photos',
    'documents',
    'reports',
  ],
  pm: [
    'cabinet',
    'objects',
    'staff',
    'assets',
    'sites',
    'inspections',
    'defects',
    'photos',
    'documents',
    'reports',
  ],
  manager: [
    'cabinet',
    'objects',
    'staff',
    'assets',
    'sites',
    'inspections',
    'defects',
    'photos',
    'documents',
    'reports',
  ],
  engineer: [
    'cabinet',
    'objects',
    'staff',
    'assets',
    'sites',
    'defects',
    'photos',
    'documents',
    'reports',
  ],
  inspector: ['cabinet', 'objects', 'sites', 'defects', 'photos', 'documents'],
  mechanic: ['cabinet', 'objects', 'assets', 'inspections'],
  driver: ['cabinet', 'objects', 'inspections'],
};

export const EDIT_HINT =
  'Вносить и изменять месторождения, проекты и объекты может руководитель проекта.';

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
  baseRole?: Role;
  group: string;
  org: string;
  locations: string[];
  specialties: string[];
}

export const CAN_MANAGE_USERS: Role[] = [
  'admin',
  'pm',
  'coordinator',
  'director',
  'manager',
  'engineer',
];

export const CAN_MANAGE_ASSETS: Role[] = [
  'admin',
  'pm',
  'coordinator',
  'director',
  'manager',
  'engineer',
  'mechanic',
];

export const CREATABLE_ROLES: Role[] = ['inspector', 'driver', 'mechanic'];

export const isAdminProfile = (p: Profile) => (p.baseRole ?? p.role) === 'admin';

export const canSeeLocation = (p: Profile, id: string) =>
  isAdminProfile(p) ||
  CAN_MANAGE_USERS.includes(p.role) ||
  !p.locations?.length ||
  p.locations.includes(id);

export const canAddLocation = (r: Role) => CAN_ADD_LOCATION.includes(r);

const DEFAULT: Profile = {
  fio: '',
  role: 'inspector',
  baseRole: undefined,
  group: '',
  org: 'ООО «Глобал-Стройинжиниринг»',
  locations: [],
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

  const admin = isAdminProfile(profile);

  return {
    profile,
    save,
    isAdmin: admin,
    viewingAs: admin && profile.role !== 'admin' ? profile.role : null,
    canAddObject: admin || CAN_EDIT.includes(profile.role),
    canManageAssets: admin || CAN_MANAGE_ASSETS.includes(profile.role),
    canManageUsers: admin || CAN_MANAGE_USERS.includes(profile.role),
    canAddLocation: admin || CAN_ADD_LOCATION.includes(profile.role),
  };
};

export const shortFio = (fio: string) => {
  const parts = fio.trim().split(/\s+/);
  if (parts.length < 2) return fio.trim();
  return `${parts[0]} ${parts[1][0]}.${parts[2] ? parts[2][0] + '.' : ''}`;
};