import { useEffect, useState } from 'react';
import Icon from '@/components/ui/icon';

const HIDE_KEY = 'gsi-install-hint-hidden-v1';

// Внутри APK-оболочки баннер не нужен: приложение уже установлено.
const isAndroidBrowser = () => {
  const ua = navigator.userAgent;
  if (!/Android/i.test(ua)) return false;
  if (/wv\)/.test(ua)) return false;
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches;
  return !standalone;
};

const InstallHint = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(HIDE_KEY) === '1') return;
    if (!isAndroidBrowser()) return;
    const t = window.setTimeout(() => setShow(true), 1200);
    return () => window.clearTimeout(t);
  }, []);

  const close = () => {
    localStorage.setItem(HIDE_KEY, '1');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-[150] animate-fade-in rounded-sm border border-border border-l-2 border-l-accent bg-card p-3 shadow-lg sm:left-auto sm:w-[380px]">
      <div className="flex items-start gap-3">
        <img src="/icon-192.png" alt="" className="h-10 w-10 flex-none rounded-sm" />
        <div className="min-w-0 flex-1">
          <p className="font-head text-[0.9em] uppercase tracking-[0.03em] text-foreground">
            Установить приложение
          </p>
          <p className="mt-0.5 text-[0.8em] leading-snug text-muted-foreground">
            Работает быстрее, иконка на рабочем столе, вход не нужно повторять.
          </p>
          <div className="mt-2.5 flex gap-2">
            <a
              href="/app"
              className="flex items-center gap-1.5 rounded-sm bg-accent px-3 py-1.5 text-[0.78em] font-head uppercase tracking-[0.05em] text-accent-foreground hover:bg-accent/90"
            >
              <Icon name="Download" size={13} />
              Установить
            </a>
            <button
              type="button"
              onClick={close}
              className="rounded-sm px-3 py-1.5 text-[0.78em] uppercase tracking-[0.05em] text-muted-foreground hover:bg-secondary"
            >
              Позже
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={close}
          aria-label="Закрыть"
          className="flex-none rounded-sm p-1 text-muted-foreground hover:bg-secondary"
        >
          <Icon name="X" size={15} />
        </button>
      </div>
    </div>
  );
};

export default InstallHint;
