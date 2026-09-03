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
import {
  KIND_ICON,
  KIND_LABEL,
  Vehicle,
  VehicleDraft,
  VehicleKind,
} from '@/data/vehicles';

const KINDS = Object.keys(KIND_LABEL) as VehicleKind[];

const dateValue = (d?: string) => (d ? d.slice(0, 10) : '');

export interface VehicleFormProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: Vehicle | null;
  onSubmit: (draft: VehicleDraft) => Promise<void> | void;
}

const VehicleForm = ({ open, onOpenChange, initial, onSubmit }: VehicleFormProps) => {
  const { toast } = useToast();
  const [plate, setPlate] = useState('');
  const [model, setModel] = useState('');
  const [kind, setKind] = useState<VehicleKind>('truck');
  const [driver, setDriver] = useState('');
  const [odometer, setOdometer] = useState('');
  const [fuelNorm, setFuelNorm] = useState('');
  const [serviceAt, setServiceAt] = useState('');
  const [osagoTo, setOsagoTo] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPlate(initial?.plate ?? '');
    setModel(initial?.model ?? '');
    setKind(initial?.kind ?? 'truck');
    setDriver(initial?.driver ?? '');
    setOdometer(initial?.odometer ? String(initial.odometer) : '');
    setFuelNorm(initial?.fuelNorm ? String(initial.fuelNorm) : '');
    setServiceAt(dateValue(initial?.serviceAt));
    setOsagoTo(dateValue(initial?.osagoTo));
    setNote(initial?.note ?? '');
  }, [open, initial]);

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
    if (!plate.trim() || !model.trim()) {
      toast({ title: 'Укажите госномер и модель', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      await onSubmit({
        plate: plate.trim(),
        model: model.trim(),
        vehicleKind: kind,
        driver: driver.trim(),
        odometer: Number(odometer) || 0,
        fuelNorm: Number(fuelNorm) || 0,
        serviceAt,
        osagoTo,
        note: note.trim(),
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
            {initial ? 'Правка техники' : 'Новая единица техники'}
          </DialogTitle>
          <DialogDescription className="text-[0.85em]">
            Госномер и модель обязательны, остальное можно дополнить позже.
          </DialogDescription>
        </DialogHeader>

        <div className="scrollbar-thin max-h-[62vh] space-y-3 overflow-y-auto pr-1">
          <div className="grid gap-3 sm:grid-cols-2">
            {field('Госномер', plate, setPlate, 'А123ВС 86')}
            {field('Модель', model, setModel, 'КамАЗ 43118')}
          </div>

          <div className="space-y-1.5">
            <Label className="text-[0.7em] uppercase tracking-[0.1em] text-muted-foreground">
              Тип техники
            </Label>
            <div className="grid grid-cols-4 gap-px bg-border">
              {KINDS.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  className={cn(
                    'flex flex-col items-center gap-1 px-2 py-2.5 text-[0.7em] uppercase tracking-[0.06em] transition-colors',
                    kind === k ? 'bg-accent text-accent-foreground' : 'bg-card hover:bg-secondary',
                  )}
                >
                  <Icon name={KIND_ICON[k]} fallback="Truck" size={16} />
                  <span className="text-center leading-tight">{KIND_LABEL[k]}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {field('Водитель', driver, setDriver, 'ФИО')}
            {field('Пробег, км', odometer, setOdometer, '0', 'number')}
            {field('Норма расхода, л/100 км', fuelNorm, setFuelNorm, '0', 'number')}
            {field('Ближайшее ТО', serviceAt, setServiceAt, undefined, 'date')}
            {field('ОСАГО до', osagoTo, setOsagoTo, undefined, 'date')}
            {field('Примечание', note, setNote, 'Кратко')}
          </div>
        </div>

        <Button
          onClick={submit}
          disabled={busy}
          className="gap-2 rounded-sm bg-accent font-head uppercase tracking-[0.06em] text-accent-foreground hover:bg-accent/90"
        >
          <Icon name={busy ? 'Loader2' : 'Check'} size={16} className={busy ? 'animate-spin' : ''} />
          {busy ? 'Сохраняем…' : initial ? 'Сохранить' : 'Добавить технику'}
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default VehicleForm;
