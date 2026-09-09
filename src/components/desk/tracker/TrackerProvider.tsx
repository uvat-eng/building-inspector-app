import { useEffect, useState } from 'react';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useProfile } from '@/data/profile';
import { useUsers } from '@/data/users';
import {
  TRACKED_ROLES,
  hasLocalConsent,
  saveConsent,
  useGeoTracker,
} from '@/data/tracker';

/**
 * Всегда смонтирован в кабинете. Для инспектора и водителя показывает
 * однократное согласие на передачу геопозиции работодателю, затем в фоне
 * пишет координаты, пока приложение открыто.
 */
const TrackerProvider = () => {
  const { profile } = useProfile();
  const { current } = useUsers();
  const [ask, setAsk] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const tracked = TRACKED_ROLES.includes(profile.role);
  const userId = current?.id ?? '';

  useEffect(() => {
    if (!tracked || !userId) {
      setAsk(false);
      setAgreed(false);
      return;
    }
    if (hasLocalConsent(userId)) {
      setAgreed(true);
      setAsk(false);
    } else {
      setAgreed(false);
      setAsk(true);
    }
  }, [tracked, userId]);

  useGeoTracker({
    userId,
    fio: profile.fio,
    role: profile.role,
    enabled: tracked && agreed && !!userId,
  });

  const accept = async () => {
    await saveConsent(userId, profile.fio);
    setAgreed(true);
    setAsk(false);
  };

  if (!tracked) return null;

  return (
    <Dialog open={ask} onOpenChange={() => undefined}>
      <DialogContent
        className="max-w-md rounded-sm [&>button]:hidden"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-head text-[1.2em] uppercase tracking-[0.03em]">
            <Icon name="MapPin" size={20} className="text-accent" />
            Контроль перемещений
          </DialogTitle>
          <DialogDescription className="text-[0.9em] leading-relaxed">
            Компания ведёт учёт рабочих перемещений сотрудников на линии. Пока
            приложение открыто, ваша геопозиция, пробег и время простоя
            передаются руководству. Это часть рабочего процесса и необходимо для
            работы в системе.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex flex-col gap-1.5 rounded-sm border border-border bg-secondary/40 p-3 text-[0.84em]">
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
          <Button
            onClick={accept}
            className="w-full gap-2 rounded-sm bg-accent font-head uppercase tracking-[0.06em] text-accent-foreground hover:bg-accent/90"
          >
            <Icon name="Check" size={16} />
            Ознакомлен и согласен
          </Button>
          <p className="text-center text-[0.74em] text-muted-foreground">
            Для доступа к рабочим функциям согласие обязательно.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TrackerProvider;
