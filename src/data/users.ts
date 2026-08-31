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
  specialties: string[];
  certificates: Certificate[];
  educations: Education[];
  createdAt: string;
}

const KEY = 'gsi-users-v1';
const SESSION = 'gsi-session-v1';
const EVENT = 'gsi-users-changed';

export const norm = (fio: string) => fio.trim().replace(/\s+/g, ' ').toLowerCase();

export const uid = () => Math.random().toString(36).slice(2, 10);

export const readUsers = (): User[] => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as User[]) : [];
  } catch {
    return [];
  }
};

const write = (list: User[]) => {
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new Event(EVENT));
};

export const findByFio = (fio: string) => readUsers().find((u) => norm(u.fio) === norm(fio));

export const readSession = (): string | null => localStorage.getItem(SESSION);

export const setSession = (id: string | null) => {
  if (id) localStorage.setItem(SESSION, id);
  else localStorage.removeItem(SESSION);
  window.dispatchEvent(new Event(EVENT));
};

export const registerUser = (u: Omit<User, 'id' | 'createdAt'>) => {
  const list = readUsers();
  if (list.some((x) => norm(x.fio) === norm(u.fio))) {
    throw new Error('Пользователь с таким ФИО уже зарегистрирован');
  }
  const user: User = { ...u, id: uid(), createdAt: new Date().toISOString() };
  write([...list, user]);
  return user;
};

export const updateUser = (id: string, patch: Partial<User>) => {
  write(readUsers().map((u) => (u.id === id ? { ...u, ...patch } : u)));
};

export const removeUser = (id: string) => write(readUsers().filter((u) => u.id !== id));

export const useUsers = () => {
  const [users, setUsers] = useState<User[]>(readUsers);
  const [sessionId, setSessionId] = useState<string | null>(readSession);

  useEffect(() => {
    const sync = () => {
      setUsers(readUsers());
      setSessionId(readSession());
    };
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const current = users.find((u) => u.id === sessionId) ?? null;

  const patch = useCallback((id: string, p: Partial<User>) => updateUser(id, p), []);

  return { users, current, sessionId, patch };
};
