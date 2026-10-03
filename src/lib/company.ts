import { useEffect, useState } from 'react';

/**
 * Компания, в которой работает пользователь.
 *
 * Сервер выдаёт подписанный пропуск компании. Пропуск прикладывается к
 * каждому обращению к серверу — по нему база отдаёт только данные этой
 * компании. Подменить пропуск нельзя: подпись проверяет сервер.
 */

export const COMPANIES_API = 'https://functions.poehali.dev/929fb8bf-f4dc-4095-95d2-7bf0835b77c8';

const KEY = 'gsi-company-v1';
const EVENT = 'gsi-company-change';
const FUNCTIONS_HOST = 'functions.poehali.dev';

export const MAIN_COMPANY_ID = 'gsi';

/** Событие: демо-компания упёрлась в лимит. В detail — раздел. */
export const DEMO_LIMIT_EVENT = 'gsi-demo-limit';

export type Plan = 'demo' | 'full' | 'closed';

export interface DemoLimits {
  objects: number;
  users: number;
  inspections: number;
  vehicles: number;
  locations: number;
}

export interface Company {
  id: string;
  name: string;
  plan: Plan;
  token: string;
  limits?: DemoLimits | null;
  accessCode?: string;
  usage?: Partial<DemoLimits>;
}

export const readCompany = (): Company | null => {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    return raw && raw.id && raw.token ? (raw as Company) : null;
  } catch {
    return null;
  }
};

export const saveCompany = (c: Company | null) => {
  if (c) localStorage.setItem(KEY, JSON.stringify(c));
  else localStorage.removeItem(KEY);
  window.dispatchEvent(new Event(EVENT));
};

/** Ключи, которые не относятся к данным компании и переживают её смену. */
const KEEP_KEYS = ['gsi-privacy-consent-v1', KEY];

/**
 * Стирает с устройства всё, что осталось от прежней компании: копии данных,
 * сессию, выбранные разделы, очереди. Иначе новая компания на миг увидит
 * чужие объекты из кеша — а это конфиденциально.
 */
export const wipeCompanyData = () => {
  Object.keys(localStorage)
    .filter((k) => !KEEP_KEYS.includes(k))
    .forEach((k) => localStorage.removeItem(k));
  try {
    indexedDB.deleteDatabase('gsi-offline');
  } catch {
    // На устройстве может не быть хранилища — не критично.
  }
};

/**
 * Переход в другую компанию: стираем данные прежней и запоминаем новую.
 * Возвращает true, если компания сменилась — тогда приложение нужно
 * перезапустить, чтобы в памяти не осталось копий чужих данных.
 */
export const switchCompany = (c: Company) => {
  const prev = readCompany();
  // Без выбранной компании на устройстве могут лежать данные основной
  // компании от прежних версий: сотрудникам основной их оставляем,
  // для любой другой компании — стираем.
  const prevId = prev?.id ?? MAIN_COMPANY_ID;
  const changed = prevId !== c.id;
  if (changed) wipeCompanyData();
  saveCompany(c);
  return changed;
};

/** Выход из компании — обратно на экран выбора, с чистого листа. */
export const leaveCompany = () => {
  wipeCompanyData();
  saveCompany(null);
  window.location.reload();
};

export const isMainCompany = (c: Company | null = readCompany()) => c?.id === MAIN_COMPANY_ID;

export const isDemo = (c: Company | null = readCompany()) => c?.plan === 'demo';

/** Название организации для документов и шапки. */
export const companyName = () => readCompany()?.name ?? '';

const MAIN_ORG = 'ООО «Глобал-Стройинжиниринг»';
const MAIN_ORG_CAPS = 'ООО «ГЛОБАЛ-Стройинжиниринг»';

/**
 * Название организации в документах.
 *
 * Основная компания печатается так же, как в её утверждённых бланках
 * (caps — написание «ГЛОБАЛ» как в предписаниях и журналах). Остальные —
 * под своим названием, указанным при регистрации.
 */
export const orgName = (caps = false) => {
  const c = readCompany();
  if (!c || c.id === MAIN_COMPANY_ID) return caps ? MAIN_ORG_CAPS : MAIN_ORG;
  return c.name;
};

/** Добавляет пропуск компании к адресу сервера. */
export const withCompany = (url: string) => {
  const c = readCompany();
  if (!c || !url.includes(FUNCTIONS_HOST) || url.includes('_co=')) return url;
  return `${url}${url.includes('?') ? '&' : '?'}_co=${encodeURIComponent(c.token)}`;
};

/**
 * Подключает пропуск ко всем обращениям приложения к серверу.
 * Вызывается один раз при запуске — так ни один раздел не уйдёт без него.
 */
export const installCompanyFetch = () => {
  const w = window as Window & { __gsiCompanyFetch?: boolean };
  if (w.__gsiCompanyFetch) return;
  w.__gsiCompanyFetch = true;
  const orig = window.fetch.bind(window);
  const send = (input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof input === 'string') return orig(withCompany(input), init);
    if (input instanceof URL) return orig(withCompany(input.toString()), init);
    if (input instanceof Request && input.url.includes(FUNCTIONS_HOST)) {
      return orig(new Request(withCompany(input.url), input), init);
    }
    return orig(input, init);
  };
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const res = await send(input, init);
    // Пропуск компании больше не действует (компания закрыта) — на экран выбора.
    if (res.status === 401 && readCompany()) {
      res
        .clone()
        .json()
        .then((d: { error?: string }) => {
          if (d?.error === 'bad_company') leaveCompany();
        })
        .catch(() => undefined);
    }
    // Демо-компания упёрлась в лимит — сразу предлагаем полный доступ.
    if (res.status === 402) {
      res
        .clone()
        .json()
        .then((d: { error?: string; table?: string }) => {
          if (d?.error === 'demo_limit') {
            window.dispatchEvent(new CustomEvent(DEMO_LIMIT_EVENT, { detail: d.table }));
          }
        })
        .catch(() => undefined);
    }
    return res;
  };
};

export const useCompany = () => {
  const [company, setCompany] = useState<Company | null>(readCompany);
  useEffect(() => {
    const on = () => setCompany(readCompany());
    window.addEventListener(EVENT, on);
    window.addEventListener('storage', on);
    return () => {
      window.removeEventListener(EVENT, on);
      window.removeEventListener('storage', on);
    };
  }, []);
  return company;
};

const call = async <T,>(method: 'GET' | 'POST', params: Record<string, string>, body?: unknown) => {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${COMPANIES_API}${qs ? `?${qs}` : ''}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error || `http_${res.status}`);
  return data;
};

/** Основная компания — для кнопки быстрого входа. */
export const fetchMainCompany = () =>
  call<{ item: Company | null }>('GET', { action: 'featured' }).then((d) => d.item);

/** Вход в существующую компанию по коду приглашения. */
export const joinCompany = (code: string) =>
  call<{ item: Company }>('POST', {}, { action: 'join', code }).then((d) => d.item);

export interface CreatedUser {
  id: string;
  fio: string;
  role: 'director';
  locations: string[];
  org: string;
}

/** Регистрация новой компании: сразу демо-доступ и учётная запись директора. */
export const createCompany = (name: string, fio: string, password: string) =>
  call<{ item: Company; user: CreatedUser }>('POST', {}, { action: 'create', name, fio, password });

/** Свежее состояние компании: тариф, остаток демо-лимитов, код приглашения. */
export const fetchCompanyStatus = (token: string, userId = '') =>
  call<{ item: Company }>('GET', { action: 'status', token, user_id: userId }).then((d) => d.item);

/** Открывает полный доступ по подтверждённой покупке из App Store. */
export const confirmPurchase = (token: string, signedTransaction: string) =>
  call<{ item: Company }>('POST', {}, { action: 'purchase', token, signedTransaction }).then(
    (d) => d.item,
  );