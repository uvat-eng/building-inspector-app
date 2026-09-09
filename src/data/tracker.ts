import { useCallback, useEffect, useRef, useState } from 'react';

export const TRACKER_API =
  'https://functions.poehali.dev/f49d9e5b-f86c-445b-9ad4-7e0fec543294';

const QUEUE_KEY = 'gsi-track-queue-v1';
const CONSENT_KEY = 'gsi-track-consent-v1';

/** Роли, за которыми ведётся геотрекинг. */
export const TRACKED_ROLES = ['inspector', 'driver'];
/** Роли, которым доступен раздел «Трекеры». */
export const TRACKER_VIEW_ROLES = ['director', 'manager', 'mechanic', 'engineer', 'admin'];

export interface TrackPoint {
  lat: number;
  lng: number;
  accuracy: number;
  speed: number;
  at: string;
}

export interface OnlineUser {
  userId: string;
  fio: string;
  role: string;
  lat: number;
  lng: number;
  accuracy: number;
  speed: number;
  at: string;
}

export interface IdleSpot {
  lat: number;
  lng: number;
  from: string;
  to: string;
  minutes: number;
}

export interface TrackDay {
  id: string;
  userId: string;
  fio: string;
  role: string;
  day: string;
  ym: string;
  distanceKm: number;
  moveMin: number;
  idleMin: number;
  points: number;
  firstAt: string;
  lastAt: string;
  idles: IdleSpot[];
}

export interface MonthRow {
  userId: string;
  fio: string;
  role: string;
  km: number;
  moveMin: number;
  idleMin: number;
  days: number;
}

const readQueue = (): TrackPoint[] => {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
};

const writeQueue = (q: TrackPoint[]) => {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q.slice(-300)));
  } catch {
    /* переполнение не критично */
  }
};

export const hasLocalConsent = (userId: string) =>
  localStorage.getItem(`${CONSENT_KEY}:${userId}`) === '1';

export const saveConsent = async (userId: string, fio: string) => {
  localStorage.setItem(`${CONSENT_KEY}:${userId}`, '1');
  try {
    await fetch(`${TRACKER_API}?action=consent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'consent', userId, fio }),
    });
  } catch {
    /* отправим позже */
  }
};

export const fmtMin = (m: number) => {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return h ? `${h} ч ${min} мин` : `${min} мин`;
};

export const ruTime = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
};

interface TrackerParams {
  userId: string;
  fio: string;
  role: string;
  enabled: boolean;
}

/**
 * Фоновый геотрекер. Пишет координаты, пока приложение открыто, и шлёт их
 * на сервер пачками. Запускается только если роль отслеживается и есть согласие.
 */
export type GeoStatus = 'checking' | 'granted' | 'denied' | 'prompt' | 'unavailable';

export const useGeoTracker = ({ userId, fio, role, enabled }: TrackerParams) => {
  const watchRef = useRef<number | null>(null);
  const lastRef = useRef<TrackPoint | null>(null);
  const [status, setStatus] = useState<GeoStatus>('checking');
  const [hasFix, setHasFix] = useState(false);

  const flush = useCallback(async () => {
    const q = readQueue();
    if (!q.length || !navigator.onLine) return;
    try {
      const r = await fetch(`${TRACKER_API}?action=ping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ping', userId, fio, role, points: q }),
      });
      if (r.ok) writeQueue([]);
    } catch {
      /* оставляем в очереди */
    }
  }, [userId, fio, role]);

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setStatus('unavailable');
      return;
    }
    let permObj: PermissionStatus | null = null;
    const sync = (state: PermissionState) =>
      setStatus(state === 'granted' ? 'granted' : state === 'denied' ? 'denied' : 'prompt');
    if (navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'geolocation' as PermissionName })
        .then((p) => {
          permObj = p;
          sync(p.state);
          p.onchange = () => {
            sync(p.state);
            if (p.state !== 'granted') setHasFix(false);
          };
        })
        .catch(() => setStatus('prompt'));
    } else {
      setStatus('prompt');
    }
    return () => {
      if (permObj) permObj.onchange = null;
    };
  }, []);

  useEffect(() => {
    if (!enabled || !userId || !('geolocation' in navigator)) return;

    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setStatus('granted');
        setHasFix(true);
        const p: TrackPoint = {
          lat: +pos.coords.latitude.toFixed(6),
          lng: +pos.coords.longitude.toFixed(6),
          accuracy: Math.round(pos.coords.accuracy || 0),
          speed: pos.coords.speed && pos.coords.speed > 0 ? +pos.coords.speed.toFixed(2) : 0,
          at: new Date().toISOString(),
        };
        const prev = lastRef.current;
        // Отсекаем дубликаты: та же точность, малое смещение, короткий интервал.
        if (prev) {
          const dt = (new Date(p.at).getTime() - new Date(prev.at).getTime()) / 1000;
          const dl =
            Math.abs(p.lat - prev.lat) + Math.abs(p.lng - prev.lng);
          if (dt < 25 && dl < 0.00005) return;
        }
        lastRef.current = p;
        writeQueue([...readQueue(), p]);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setStatus('denied');
          setHasFix(false);
        }
      },
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 },
    );

    const timer = window.setInterval(flush, 60000);
    flush();

    return () => {
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
      window.clearInterval(timer);
      flush();
    };
  }, [enabled, userId, fio, role, flush]);

  const requestGeo = useCallback(
    () =>
      new Promise<boolean>((resolve) => {
        if (!('geolocation' in navigator)) {
          setStatus('unavailable');
          resolve(false);
          return;
        }
        navigator.geolocation.getCurrentPosition(
          () => {
            setStatus('granted');
            setHasFix(true);
            resolve(true);
          },
          (err) => {
            setStatus(err.code === err.PERMISSION_DENIED ? 'denied' : 'prompt');
            resolve(false);
          },
          { enableHighAccuracy: true, timeout: 20000 },
        );
      }),
    [],
  );

  return { status, hasFix, requestGeo };
};

export const useOnline = (active: boolean, intervalMs = 20000) => {
  const [items, setItems] = useState<OnlineUser[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const r = await fetch(`${TRACKER_API}?action=online`);
      const d = (await r.json()) as { items: OnlineUser[] };
      setItems(d.items ?? []);
    } catch {
      /* оставляем прежние */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!active) return;
    reload();
    const t = window.setInterval(reload, intervalMs);
    return () => window.clearInterval(t);
  }, [active, intervalMs, reload]);

  return { items, loading, reload };
};

export const useTrackDays = (ym: string, active: boolean) => {
  const [items, setItems] = useState<TrackDay[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${TRACKER_API}?action=days&ym=${encodeURIComponent(ym)}`);
      const d = (await r.json()) as { items: TrackDay[] };
      setItems(d.items ?? []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [ym]);

  useEffect(() => {
    if (active) reload();
  }, [active, reload]);

  return { items, loading, reload };
};

export const fetchTrack = async (userId: string, day: string) => {
  const r = await fetch(
    `${TRACKER_API}?action=track&userId=${encodeURIComponent(userId)}&day=${day}`,
  );
  const d = (await r.json()) as { points: TrackPoint[] };
  return d.points ?? [];
};

export const fetchMonth = async (ym: string) => {
  const r = await fetch(`${TRACKER_API}?action=month&ym=${encodeURIComponent(ym)}`);
  return (await r.json()) as { ym: string; rows: MonthRow[]; createdAt: string };
};

export const buildMonth = async (ym: string) => {
  const r = await fetch(`${TRACKER_API}?action=month&ym=${encodeURIComponent(ym)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'month', ym }),
  });
  return (await r.json()) as { ym: string; rows: MonthRow[] };
};

/** Раз в сутки просим сервер закрыть месяц, если он последний день. */
export const autoCloseMonth = () => {
  const key = 'gsi-track-autoclose';
  const today = new Date().toISOString().slice(0, 10);
  if (localStorage.getItem(key) === today) return;
  localStorage.setItem(key, today);
  fetch(`${TRACKER_API}?action=autoclose`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  }).catch(() => undefined);
};