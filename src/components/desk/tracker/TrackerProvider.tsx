import { useEffect, useState } from 'react';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { useProfile } from '@/data/profile';
import { useUsers } from '@/data/users';
import {
  TRACKED_ROLES,
  hasLocalConsent,
  saveConsent,
  useGeoTracker,
} from '@/data/tracker';

/**
 * Всегда смонтирован в кабинете. Для инспектора и водителя требует согласие
 * и активную геолокацию: пока доступ к позиции не выдан, работа в приложении
 * полностью заблокирована. Дальше в фоне пишет координаты, пока окно открыто.
 */
const TrackerProvider = () => {
  const { profile } = useProfile();
  const { current } = useUsers();
  const [consent, setConsent] = useState(false);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);

  const tracked = TRACKED_ROLES.includes(profile.role);
  const userId = current?.id ?? '';

  const { status, hasFix, requestGeo } = useGeoTracker({
    userId,
    fio: profile.fio,
    role: profile.role,
    enabled: tracked && consent && !!userId,
  });

  useEffect(() => {
    if (tracked && userId && hasLocalConsent(userId)) setConsent(true);
    else setConsent(false);
    setChecked(false);
  }, [tracked, userId]);

  if (!tracked) return null;

  const geoOk = status === 'granted' || hasFix;
  // Приложение открыто только когда есть согласие И живой доступ к позиции.
  if (consent && geoOk) return null;

  const grant = async () => {
    setBusy(true);
    const ok = await requestGeo();
    if (ok && userId) {
      await saveConsent(userId, profile.fio);
      setConsent(true);
    }
    setBusy(false);
  };

  const denied = status === 'denied';
  const unavailable = status === 'unavailable';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-sm border border-border border-t-2 border-t-accent bg-card p-6 shadow-lg">
        <div className="flex items-center gap-2.5">
          <span className="flex h-11 w-11 flex-none items-center justify-center rounded-sm bg-accent text-accent-foreground">
            <Icon name="MapPin" size={22} />
          </span>
          <div>
            <h2 className="font-head text-[1.15em] uppercase leading-tight tracking-[0.03em]">
              Доступ к геолокации
            </h2>
            <p className="text-[0.78em] text-muted-foreground">
              {profile.fio || 'Сотрудник'}
            </p>
          </div>
        </div>

        <p className="mt-4 text-[0.9em] leading-relaxed text-foreground">
          Компания ведёт учёт рабочих перемещений сотрудников на линии. Работа в
          приложении возможна только при включённой геолокации: маршрут, пробег и
          время простоя передаются руководству.
        </p>

        <div className="mt-4 flex flex-col gap-1.5 rounded-sm border border-border bg-secondary/40 p-3 text-[0.84em]">
          <span className="flex items-center gap-2">
            <Icon name="Route" size={14} className="text-accent" />
            Маршрут и пробег за смену
          </span>
          <span className="flex items-center gap-2">
            <Icon name="Timer" size={14} className="text-accent" />
            Время в движении и на простое
          </span>
          <span className="flex items-center gap-2">
            <Icon name="ShieldCheck" size={14} className="text-accent" />
            Данные видит только руководство компании
          </span>
        </div>

        {denied && (
          <div className="mt-3 flex items-start gap-2 rounded-sm border border-destructive/40 bg-destructive/10 p-3 text-[0.82em] text-destructive">
            <Icon name="TriangleAlert" size={15} className="mt-0.5 flex-none" />
            <span>
              Доступ к геолокации запрещён в браузере. Откройте настройки сайта,
              разрешите «Определение местоположения» и обновите страницу — без
              этого вход в приложение невозможен.
            </span>
          </div>
        )}

        {unavailable && (
          <div className="mt-3 flex items-start gap-2 rounded-sm border border-destructive/40 bg-destructive/10 p-3 text-[0.82em] text-destructive">
            <Icon name="TriangleAlert" size={15} className="mt-0.5 flex-none" />
            <span>
              Устройство не поддерживает геолокацию или сайт открыт без
              защищённого соединения. Работа невозможна.
            </span>
          </div>
        )}

        <label className="mt-4 flex cursor-pointer items-start gap-2.5">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-0.5 h-4 w-4 flex-none accent-[hsl(var(--accent))]"
          />
          <span className="text-[0.82em] leading-snug text-muted-foreground">
            Ознакомлен и согласен на сбор и обработку данных о моих рабочих
            перемещениях и геопозиции в рабочее время.
          </span>
        </label>

        <Button
          onClick={grant}
          disabled={!checked || busy || unavailable}
          className="mt-4 w-full gap-2 rounded-sm bg-accent font-head uppercase tracking-[0.06em] text-accent-foreground hover:bg-accent/90"
        >
          <Icon
            name={busy ? 'Loader2' : 'LocateFixed'}
            size={16}
            className={busy ? 'animate-spin' : ''}
          />
          {busy ? 'Определяем позицию…' : 'Включить геолокацию и войти'}
        </Button>

        <p className="mt-3 text-center text-[0.74em] text-muted-foreground">
          Без активной геолокации ввод и любые действия в приложении недоступны.
        </p>
      </div>
    </div>
  );
};

export default TrackerProvider;