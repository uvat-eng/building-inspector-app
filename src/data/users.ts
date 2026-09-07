import { useCallback, useEffect, useState } from 'react';
import { Role } from '@/data/profile';

export interface Certificate {
  id: string;
  number: string;
  issued: string;
  until: string;
  area: string;
}

export interface Education {
  id: string;
  institution: string;
  specialty: string;
  docNumber: string;
  year: string;
}

export interface User {
  id: string;
  fio: string;
  password: string;
  role: Role;
  group: string;
  org: string;
  phone: string;
  locations: string[];
  objects?: string[];
  chief?: string;
  mustChangePassword?: boolean;
  specialties: string[];
  certificates: Certificate[];
  educations: Education[];
  createdAt: string;
}

const API = 'https://functions.poehali.dev/cd923bff-c036-4154-8040-f9ae72a2260f';
const SESSION = 'gsi-session-v1';
const EVENT = 'gsi-users-changed';

let cache: User[] = [];

export const norm = (fio: string) => fio.trim().replace(/\s+/g, ' ').toLowerCase();

export const uid = () => Math.random().toString(36).slice(2, 10);

const publish = (list: User[]) => {
  cache = list;
  window.dispatchEvent(new Event(EVENT));
};

export const fetchUsers = async () => {
  const res = await fetch(API);
  if (!res.ok) throw new Error('load failed');
  const { items } = (await res.json()) as { items: User[] };
  publish(items);
  return items;
};

export const readSession = (): string | null => localStorage.getItem(SESSION);

export const setSession = (id: string | null) => {
  if (id) localStorage.setItem(SESSION, id);
  else localStorage.removeItem(SESSION);
  window.dispatchEvent(new Event(EVENT));
};

export const loginUser = async (fio: string, password: string) => {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'login', fio, password }),
  });
  if (res.status === 404) throw new Error('not_found');
  if (res.status === 403) throw new Error('wrong_password');
  if (!res.ok) throw new Error('login_failed');
  const { item } = (await res.json()) as { item: User };
  return item;
};

export const registerUser = async (
  u: Omit<User, 'id' | 'createdAt'>,
  byUserId?: string,
) => {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'register', byUserId: byUserId ?? '', ...u }),
  });
  if (res.status === 409) throw new Error('exists');
  if (res.status === 403) throw new Error('not_allowed');
  if (!res.ok) throw new Error('register_failed');
  const { item } = (await res.json()) as { item: User };
  publish([...cache, item]);
  return item;
};

export const changePassword = async (
  id: string,
  oldPassword: string,
  newPassword: string,
) => {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'change_password', id, oldPassword, newPassword }),
  });
  if (res.status === 403) throw new Error('wrong_password');
  if (res.status === 400) {
    const { error } = (await res.json()) as { error: string };
    throw new Error(error);
  }
  if (!res.ok) throw new Error('change_failed');
  const { item } = (await res.json()) as { item: User };
  publish(cache.map((u) => (u.id === id ? item : u)));
  return item;
};

export const updateUser = async (id: string, patch: Partial<User>) => {
  publish(cache.map((u) => (u.id === id ? { ...u, ...patch } : u)));
  const res = await fetch(API, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, patch }),
  });
  if (!res.ok) throw new Error('update_failed');
};

export const removeUser = async (id: string) => {
  publish(cache.filter((u) => u.id !== id));
  await fetch(`${API}?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
};

export const useUsers = () => {
  const [users, setUsers] = useState<User[]>(cache);
  const [sessionId, setSessionId] = useState<string | null>(readSession);
  const [loading, setLoading] = useState(cache.length === 0);

  useEffect(() => {
    const sync = () => {
      setUsers(cache);
      setSessionId(readSession());
    };
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    fetchUsers()
      .catch(() => undefined)
      .finally(() => setLoading(false));
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const current = users.find((u) => u.id === sessionId) ?? null;

  const patch = useCallback((id: string, p: Partial<User>) => updateUser(id, p), []);

  return { users, current, sessionId, loading, patch, reload: fetchUsers };
};
