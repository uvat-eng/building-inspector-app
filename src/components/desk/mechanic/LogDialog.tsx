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
import { LOG_LABEL, LogKind, VehicleLog } from '@/data/vehicles';

const AMOUNT_LABEL: Record<LogKind, string> = {
  service: 'Сумма, ₽',
  fuel: 'Литры',
  waybill: 'Пробег за смену, км',
};

const today = () => new Date().toISOString().slice(0, 10);

export interface LogDialogProps {
  kind: LogKind | null;
  onOpenChange: (v: boolean) => void;
  odometer?: number;
  onSubmit: (payload: Omit<VehicleLog, 'id' | 'kind' | 'vehicleId' | 'author'>) => Promise<void> | void;
}

const LogDialog = ({ kind, onOpenChange, odometer, onSubmit }: LogDialogProps) => {
  const [date, setDate] = useState(today);
  const [odo, setOdo] = useState('');
  const [amount, setAmount] = useState('');
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!kind) return;
    setDate(today());
    setOdo(odometer ? String(odometer) : '');
    setAmount('');
    setContent('');
  }, [kind, odometer]);

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
    setBusy(true);
    try {
      await onSubmit({
        date,
        odometer: Number(odo) || 0,
        amount: Number(amount) || 0,
        content: content.trim(),
      });
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!kind} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent className="max-w-md rounded-sm">
        <DialogHeader>
          <DialogTitle className="font-head text-[1.2em] uppercase tracking-[0.03em]">
            {kind ? LOG_LABEL[kind] : ''}
          </DialogTitle>
          <DialogDescription className="text-[0.85em]">
            Запись попадёт в журнал техники.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            {field('Дата', date, setDate, undefined, 'date')}
            {field('Пробег, км', odo, setOdo, '0', 'number')}
          </div>
          {field(kind ? AMOUNT_LABEL[kind] : '', amount, setAmount, '0', 'number')}
          {field('Описание', content, setContent, 'Что сделано')}
        </div>

        <Button
          onClick={submit}
          disabled={busy}
          className="gap-2 rounded-sm bg-accent font-head uppercase tracking-[0.06em] text-accent-foreground hover:bg-accent/90"
        >
          <Icon name={busy ? 'Loader2' : 'Check'} size={16} className={busy ? 'animate-spin' : ''} />
          {busy ? 'Сохраняем…' : 'Записать'}
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default LogDialog;
