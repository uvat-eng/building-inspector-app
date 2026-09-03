import { useEffect, useState } from 'react';
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
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Vehicle } from '@/data/vehicles';

const today = () => new Date().toISOString().slice(0, 10);

export interface WaybillPayload {
  vehicleId: string;
  date: string;
  odometer: number;
  amount: number;
  content: string;
}

export interface WaybillFormProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  vehicles: Vehicle[];
  project: string;
  author: string;
  onSubmit: (payload: WaybillPayload) => Promise<void> | void;
}

const WaybillForm = ({
  open,
  onOpenChange,
  vehicles,
  project,
  author,
  onSubmit,
}: WaybillFormProps) => {
  const { toast } = useToast();
  const [vehicleId, setVehicleId] = useState('');
  const [date, setDate] = useState(today);
  const [odometer, setOdometer] = useState('');
  const [amount, setAmount] = useState('');
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    const first = vehicles[0];
    setVehicleId(first?.id ?? '');
    setDate(today());
    setOdometer(first?.odometer ? String(first.odometer) : '');
    setAmount('');
    setContent('');
  }, [open, vehicles]);

  const pick = (id: string) => {
    setVehicleId(id);
    const v = vehicles.find((x) => x.id === id);
    setOdometer(v?.odometer ? String(v.odometer) : '');
  };

  const field = (
    label: string,
    value: string,
    set: (v: string) => void,
    ph?: string,
    type?: string,
  ) => (
    <div className="space-y-1">
      <Label className="text-[0.68em] uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </Label>
      <Input
        type={type}
        value={value}
        onChange={(e) => set(e.target.value)}
        placeholder={ph}
        className="h-9 rounded-sm"
      />
    </div>
  );

  const submit = async () => {
    if (!vehicleId) {
      toast({ title: 'Выберите автомобиль', variant: 'destructive' });
      return;
    }
    if (!(Number(amount) > 0)) {
      toast({ title: 'Укажите пробег за смену', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      await onSubmit({
        vehicleId,
        date,
        odometer: Number(odometer) || 0,
        amount: Number(amount) || 0,
        content: content.trim(),
      });
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent className="max-w-lg rounded-sm">
        <DialogHeader>
          <DialogTitle className="font-head text-[1.2em] uppercase tracking-[0.03em]">
            Новый путевой лист
          </DialogTitle>
          <DialogDescription className="text-[0.85em]">
            Лист попадёт в журнал техники и в месячный реестр.
          </DialogDescription>
        </DialogHeader>

        <div className="scrollbar-thin max-h-[62vh] space-y-3 overflow-y-auto pr-1">
          <p className="flex items-start gap-2 rounded-sm border border-border bg-secondary/60 px-3 py-2.5 text-[0.82em] leading-snug">
            <Icon name="Info" size={15} className="mt-0.5 flex-none text-accent" />
            {project
              ? `Проект: ${project}. Данные проекта и водителя подставлены автоматически.`
              : 'Проект не назначен — обратитесь к руководителю.'}
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            {field('Дата', date, setDate, undefined, 'date')}
            <div className="space-y-1">
              <Label className="text-[0.68em] uppercase tracking-[0.1em] text-muted-foreground">
                Оформил
              </Label>
              <Input readOnly value={author} className="h-9 rounded-sm bg-secondary/60 text-muted-foreground" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[0.7em] uppercase tracking-[0.1em] text-muted-foreground">
              Автомобиль
            </Label>
            {vehicles.length === 0 ? (
              <p className="rounded-sm border border-border px-3 py-2.5 text-[0.85em] text-muted-foreground">
                Машины не найдены
              </p>
            ) : (
              <div className="grid gap-px bg-border sm:grid-cols-2">
                {vehicles.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => pick(v.id)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2.5 text-left text-[0.82em] transition-colors',
                      vehicleId === v.id
                        ? 'bg-accent text-accent-foreground'
                        : 'bg-card hover:bg-secondary',
                    )}
                  >
                    <Icon name="Truck" size={15} className="flex-none" />
                    <span className="min-w-0 truncate">{`${v.plate} · ${v.model}`}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {field('Пробег на конец смены, км', odometer, setOdometer, '0', 'number')}
            {field('Пройдено за смену, км', amount, setAmount, '0', 'number')}
          </div>

          {field('Маршрут / задание', content, setContent, 'Куда и зачем')}

          <div className="space-y-1">
            <Label className="text-[0.68em] uppercase tracking-[0.1em] text-muted-foreground">
              Проект
            </Label>
            <Input
              readOnly
              value={project || 'не назначен'}
              className="h-9 rounded-sm bg-secondary/60 text-muted-foreground"
            />
          </div>
        </div>

        <Button
          onClick={submit}
          disabled={busy}
          className="gap-2 rounded-sm bg-accent font-head uppercase tracking-[0.06em] text-accent-foreground hover:bg-accent/90"
        >
          <Icon name={busy ? 'Loader2' : 'Check'} size={16} className={busy ? 'animate-spin' : ''} />
          {busy ? 'Сохраняем…' : 'Оформить лист'}
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default WaybillForm;
