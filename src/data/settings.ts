import { useCallback, useEffect, useState } from 'react';

export interface Settings {
  manager_email: string;
  manager_name: string;
  customer_email: string;
}

const API = 'https://functions.poehali.dev/85ad61a8-9c07-4682-bc53-d03d5acfef15';
const KEY = 'gsi-settings-v1';
const EVENT = 'gsi-settings-changed';

const empty: Settings = { manager_email: '', manager_name: '', customer_email: '' };

const read = (): Settings => {
  try {
    return { ...empty, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return empty;
  }
};

const write = (s: Settings) => {
  localStorage.setItem(KEY, JSON.stringify(s));
  window.dispatchEvent(new Event(EVENT));
};

export const useSettings = () => {
  const [settings, setSettings] = useState<Settings>(read);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const sync = () => setSettings(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    fetch(API)
      .then((r) => r.json())
      .then((d: { settings: Partial<Settings> }) => write({ ...empty, ...d.settings }))
      .catch(() => undefined);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const save = useCallback(async (patch: Partial<Settings>) => {
    write({ ...read(), ...patch });
    setSaving(true);
    try {
      await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
    } finally {
      setSaving(false);
    }
  }, []);

  return { settings, save, saving };
};
