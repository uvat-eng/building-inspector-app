import { useCallback, useEffect, useState } from 'react';

export type Role = 'deputy' | 'chief' | 'inspector' | 'customer' | 'contractor';

export const ROLE_LABEL: Record<Role, string> = {
  deputy: 'Заместитель директора заказчика',
  chief: 'Руководитель группы',
  inspector: 'Инспектор строительного контроля',
  customer: 'Представитель заказчика',
  contractor: 'Представитель подрядчика',
};

export interface Profile {
  fio: string;
  role: Role;
  group: string;
  org: string;
}

const DEFAULT: Profile = {
  fio: '',
  role: 'deputy',
  group: '',
  org: 'ООО «Глобал-Стройинжиниринг»',
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

  return { profile, save, canAddObject: profile.role === 'deputy' };
};

export const shortFio = (fio: string) => {
  const parts = fio.trim().split(/\s+/);
  if (parts.length < 2) return fio.trim();
  return `${parts[0]} ${parts[1][0]}.${parts[2] ? parts[2][0] + '.' : ''}`;
};
