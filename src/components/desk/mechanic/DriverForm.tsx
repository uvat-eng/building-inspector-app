import { useState } from 'react';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useProfile } from '@/data/profile';
import { registerUser, useUsers } from '@/data/users';
import { Vehicle } from '@/data/vehicles';
import { createFleet } from '@/data/fleet';
import { useObjects } from '@/data/store';
import { useLocations } from '@/data/locations';

interface DriverFormProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  vehicles: Vehicle[];
  onDone: () => void;
}

const DriverForm = ({ open, onOpenChange, vehicles, onDone }: DriverFormProps) => {
  const { toast } = useToast();
  const { profile } = useProfile();
  const { current } = useUsers();
  const { list: objects } = useObjects();
  const { list: locations } = useLocations();

  const [fio, setFio] = useState('');
  const [pass, setPass] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [locIds, setLocIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const car = vehicles.find((v) => v.id === vehicleId) ?? null;
  // Проект и локация водителя вычисляются из закреплённой машины.
  const carObject = car?.objectId ? objects.find((o) => o.id === car.objectId) : null;
  const carLocationId = carObject?.location || car?.locationId || '';
  const carProject = carObject?.field?.trim() || '';
  const carLocTitle =
    locations.find((l) => l.id === carLocationId)?.title || carLocationId;

  // Итоговый набор локаций доступа: локация машины + выбранные механиком.
  const grantedLocs = Array.from(
    new Set([...(carLocationId ? [carLocationId] : []), ...locIds]),
  );

  const toggleLoc = (id: string) =>
    setLocIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const reset = () => {
    setFio('');
    setPass('');
    setPhone('');
    setVehicleId('');
    setStartAt('');
    setEndAt('');
    setLocIds([]);
  };

  const save = async () => {
    if (fio.trim().split(/\s+/).length < 2) {
      toast({ title: 'Укажите фамилию, имя и отчество', variant: 'destructive' });
      return;
    }
    if (pass && pass.length < 4) {
      toast({ title: 'Пароль минимум 4 символа', variant: 'destructive' });
      return;
    }
    if (!grantedLocs.length) {
      toast({
        title: 'Закрепите за водителем локацию',
        description: 'Выберите машину с локацией или отметьте локацию вручную.',
        variant: 'destructive',
      });
      return;
    }
    setBusy(true);
    try {
      const clean = fio.trim().replace(/\s+/g, ' ');
      const user = await registerUser(
        {
          fio: clean,
          password: pass,
          role: 'driver',
          group: carProject,
          org: profile.org,
          phone: phone.trim(),
          locations: grantedLocs,
          specialties: [],
          certificates: [],
          educations: [],
        },
        current?.id,
      );

      if (vehicleId) {
        await createFleet('shift', {
          vehicleId,
          driverId: user.id,
          driverFio: clean,
          startAt,
          endAt,
          author: profile.fio,
        });
      }

      toast({
        title: 'Водитель создан',
        description: pass
          ? `${clean} · вход по паролю`
          : `${clean} · первый вход без пароля, система попросит задать свой`,
      });
      reset();
      onOpenChange(false);
      onDone();
    } catch (e) {
      const c = (e as Error).message;
      toast({
        title:
          c === 'exists'
            ? 'Такой сотрудник уже есть'
            : c === 'role_not_allowed' || c === 'not_allowed'
              ? 'Недостаточно прав'
              : 'Не удалось создать',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-lg overflow-y-auto rounded-sm">
        <DialogHeader>
          <DialogTitle className="font-head text-[1.2em] uppercase tracking-[0.03em]">
            Новый водитель
          </DialogTitle>
          <DialogDescription>
            Логин — это ФИО. Сразу можно закрепить технику и указать даты заезда и выезда с вахты.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5">
          <div className="space-y-1.5">
            <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
              Фамилия Имя Отчество · это и есть логин
            </Label>
            <Input
              value={fio}
              onChange={(e) => setFio(e.target.value)}
              placeholder="Петров Пётр Петрович"
              className="rounded-sm"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
                Пароль
              </Label>
              <Input
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                placeholder="можно оставить пустым"
                className="rounded-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
                Телефон
              </Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+7 900 000-00-00"
                className="rounded-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
              Закрепить технику
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {vehicles.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setVehicleId(vehicleId === v.id ? '' : v.id)}
                  className={cn(
                    'max-w-[15rem] truncate rounded-sm border px-2 py-1 text-[0.8em] transition-colors',
                    vehicleId === v.id
                      ? 'border-accent bg-accent text-accent-foreground'
                      : 'border-input hover:bg-secondary',
                  )}
                >
                  {v.plate || 'б/н'} · {v.model}
                </button>
              ))}
            </div>
            {car && (
              <div className="mt-1 flex items-start gap-2 rounded-sm border border-border bg-secondary/40 px-3 py-2 text-[0.8em]">
                <Icon name="MapPin" size={14} className="mt-0.5 flex-none text-accent" />
                <span>
                  {carLocationId ? (
                    <>
                      Водителю откроется только проект{' '}
                      <b>{carLocTitle}</b>
                      {carProject ? (
                        <>
                          {' · '}
                          <b>{carProject}</b>
                        </>
                      ) : (
                        ''
                      )}
                      . Другие локации будут недоступны.
                    </>
                  ) : (
                    <span className="text-destructive">
                      У этой машины не указана локация — задайте её в карточке
                      техники, иначе водитель не будет закреплён за проектом.
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
              Доступные локации
            </Label>
            <p className="text-[0.76em] text-muted-foreground">
              Локация машины закрепляется автоматически. Отметьте дополнительные,
              если водитель работает на нескольких.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {locations.map((l) => {
                const fromCar = l.id === carLocationId;
                const on = grantedLocs.includes(l.id);
                return (
                  <button
                    key={l.id}
                    type="button"
                    disabled={fromCar}
                    onClick={() => toggleLoc(l.id)}
                    className={cn(
                      'flex items-center gap-1.5 rounded-sm border px-2.5 py-1 text-[0.8em] transition-colors',
                      on
                        ? 'border-accent bg-accent text-accent-foreground'
                        : 'border-input hover:bg-secondary',
                      fromCar && 'cursor-default opacity-90',
                    )}
                    title={fromCar ? 'Локация машины — закреплена автоматически' : undefined}
                  >
                    <Icon name={l.icon} fallback="MapPin" size={13} />
                    {l.title}
                    {fromCar && <Icon name="Lock" size={11} className="opacity-70" />}
                  </button>
                );
              })}
            </div>
            {!grantedLocs.length && (
              <p className="text-[0.78em] text-destructive">
                Выберите хотя бы одну локацию — без неё водитель не получит доступ.
              </p>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
                Заезд на вахту
              </Label>
              <Input
                type="date"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                className="rounded-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
                Выезд с вахты
              </Label>
              <Input
                type="date"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
                className="rounded-sm"
              />
            </div>
          </div>

          <Button
            onClick={save}
            disabled={busy}
            className="w-full gap-2 rounded-sm bg-accent font-head uppercase tracking-[0.06em] text-accent-foreground hover:bg-accent/90"
          >
            <Icon
              name={busy ? 'Loader2' : 'UserPlus'}
              size={16}
              className={busy ? 'animate-spin' : ''}
            />
            {busy ? 'Создаём…' : 'Создать водителя'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DriverForm;