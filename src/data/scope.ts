import { useCallback, useEffect, useState } from 'react';

export interface Scope {
  locationId: string;
  project: string;
}

const KEY = 'gsi-scope-v1';
const EVENT = 'gsi-scope-changed';

const read = (): Scope => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Scope) : { locationId: '', project: '' };
  } catch {
    return { locationId: '', project: '' };
  }
};

export const useScope = () => {
  const [scope, setScope] = useState<Scope>(read);

  useEffect(() => {
    const sync = () => setScope(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const save = useCallback((s: Partial<Scope>) => {
    localStorage.setItem(KEY, JSON.stringify({ ...read(), ...s }));
    window.dispatchEvent(new Event(EVENT));
  }, []);

  const clear = useCallback(() => {
    localStorage.removeItem(KEY);
    window.dispatchEvent(new Event(EVENT));
  }, []);

  return { scope, save, clear };
};
