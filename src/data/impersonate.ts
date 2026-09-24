import { useCallback, useEffect, useState } from 'react';
import { Profile, Role } from '@/data/profile';
import { User, setSession, readSession } from '@/data/users';

const KEY = 'gsi-impersonate-v1';
const EVENT = 'gsi-impersonate-changed';
const PROFILE_KEY = 'gsi-profile-v1';
const PROFILE_EVENT = 'gsi-profile-changed';

export interface Impersonation {
  ownUserId: string;
  ownFio: string;
  ownRole: Role;
  ownProfile: Profile;
  asUserId: string;
  asFio: string;
  asRole: Role;
}

export const readImpersonation = (): Impersonation | null => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Impersonation) : null;
  } catch {
    return null;
  }
};

const profileOf = (u: User): Profile => ({
  fio: u.fio,
  role: u.role,
  baseRole: u.role,
  group: u.group,
  org: u.org,
  locations: u.locations ?? [],
  specialties: u.specialties ?? [],
  objects: u.objects ?? [],
  chief: u.chief ?? '',
  userId: u.id,
});

const applyProfile = (p: Profile) => {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
  window.dispatchEvent(new Event(PROFILE_EVENT));
};

/** Директор входит в кабинет сотрудника: подменяем сессию, свою — запоминаем. */
export const startImpersonation = (target: User, ownProfile: Profile) => {
  const existing = readImpersonation();
  const own = existing
    ? {
        ownUserId: existing.ownUserId,
        ownFio: existing.ownFio,
        ownRole: existing.ownRole,
        ownProfile: existing.ownProfile,
      }
    : {
        ownUserId: ownProfile.userId ?? readSession() ?? '',
        ownFio: ownProfile.fio,
        ownRole: ownProfile.role,
        ownProfile,
      };

  localStorage.setItem(
    KEY,
    JSON.stringify({
      ...own,
      asUserId: target.id,
      asFio: target.fio,
      asRole: target.role,
    } satisfies Impersonation),
  );
  setSession(target.id);
  applyProfile(profileOf(target));
  window.dispatchEvent(new Event(EVENT));
};

/** Полный сброс подмены без возврата прежней сессии — для выхода из аккаунта. */
export const dropImpersonation = () => {
  localStorage.removeItem(KEY);
  window.dispatchEvent(new Event(EVENT));
};

/** Возврат директора в собственный кабинет. */
export const stopImpersonation = () => {
  const cur = readImpersonation();
  localStorage.removeItem(KEY);
  if (cur) {
    setSession(cur.ownUserId || null);
    applyProfile({ ...cur.ownProfile, role: cur.ownRole, baseRole: cur.ownRole });
  }
  window.dispatchEvent(new Event(EVENT));
};

export const useImpersonation = () => {
  const [state, setState] = useState<Impersonation | null>(readImpersonation);

  useEffect(() => {
    const sync = () => setState(readImpersonation());
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const stop = useCallback(() => stopImpersonation(), []);

  return { impersonation: state, stop };
};