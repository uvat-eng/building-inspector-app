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

  const [fio, setFio] = useState('');
  const [pass, setPass] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setFio('');
    setPass('');
    setPhone('');
    setVehicleId('');
    setStartAt('');
    setEndAt('');
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
    setBusy(true);
    try {
      const clean = fio.trim().replace(/\s+/g, ' ');
      const user = await registerUser(
        {
          fio: clean,
          password: pass,
          role: 'driver',
          group: '',
          org: profile.org,
          phone: phone.trim(),
          locations: [],
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
