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
import { Vehicle, KIND_LABEL } from '@/data/vehicles';
import {
  FleetMaint,
  MAINT_ITEMS,
  createFleet,
  daysTo,
  ruDate,
  useFleet,
} from '@/data/fleet';

interface CarDialogProps {
  vehicle: Vehicle | null;
  onClose: () => void;
}

const CarDialog = ({ vehicle, onClose }: CarDialogProps) => {
  const { toast } = useToast();
  const { profile } = useProfile();
  const { maint, reload } = useFleet();

  const [edit, setEdit] = useState<string | null>(null);
  const [lastAt, setLastAt] = useState('');
  const [nextAt, setNextAt] = useState('');
  const [busy, setBusy] = useState(false);

  const rowOf = (key: string): FleetMaint | undefined =>
    maint.find((m) => m.vehicleId === vehicle?.id && m.itemKey === key);

  const open = (key: string) => {
    const r = rowOf(key);
    setLastAt(r?.lastAt ?? '');
    setNextAt(r?.nextAt ?? '');
    setEdit(key);
  };

  const save = async () => {
    if (!vehicle || !edit) return;
    setBusy(true);
    try {
      await createFleet('maint', {
        vehicleId: vehicle.id,
        itemKey: edit,
        lastAt,
        nextAt,
        odometer: vehicle.odometer,
        author: profile.fio,
      });
      toast({ title: 'Отметка сохранена' });
      setEdit(null);
      reload();
    } catch {
      toast({ title: 'Не удалось сохранить', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Dialog open={!!vehicle} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="max-h-[88vh] max-w-lg overflow-y-auto rounded-sm">
          <DialogHeader>
            <DialogTitle className="font-head text-[1.2em] uppercase tracking-[0.03em]">
              {vehicle?.model || 'Автомобиль'}
            </DialogTitle>
            <DialogDescription>
              {vehicle?.plate || 'без номера'} ·{' '}
              {vehicle ? KIND_LABEL[vehicle.kind] ?? vehicle.kind : ''}
            </DialogDescription>
          </DialogHeader>

          {vehicle && (
            <div className="space-y-3.5">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { l: 'Пробег, км', v: String(vehicle.odometer || 0), i: 'Gauge' },
                  { l: 'Статус', v: vehicle.status, i: 'Activity' },
                  {
                    l: 'Расход, л/100',
                    v: String(vehicle.fuelNorm || 0),
                    i: 'Fuel',
                  },
                  { l: 'ОСАГО до', v: ruDate(vehicle.osagoTo) || '—', i: 'ShieldCheck' },
                ].map((c) => (
                  <div
                    key={c.l}
                    className="flex items-center gap-2.5 rounded-sm border border-border bg-card px-3 py-2.5"
                  >
                    <span className="flex h-8 w-8 flex-none items-center justify-center rounded-sm bg-secondary text-accent">
                      <Icon name={c.i} fallback="Circle" size={15} />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-head text-[0.95em] leading-none">
                        {c.v}
                      </span>
                      <span className="mt-1 block truncate text-[0.68em] uppercase tracking-[0.08em] text-muted-foreground">
                        {c.l}
                      </span>
                    </span>
                  </div>
                ))}
              </div>

              <div className="space-y-1.5">
                <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
                  Техническое обслуживание · отмечайте сами
                </Label>
                <div className="flex flex-col gap-1.5">
                  {MAINT_ITEMS.map((it) => {
                    const r = rowOf(it.key);
                    const left = daysTo(r?.nextAt);
                    return (
                      <button
                        key={it.key}
                        type="button"
                        onClick={() => open(it.key)}
                        className="flex items-center gap-2.5 rounded-sm border border-border bg-card px-3 py-2.5 text-left transition-colors hover:border-accent hover:bg-secondary"
                      >
                        <span className="flex h-8 w-8 flex-none items-center justify-center rounded-sm bg-secondary text-accent">
                          <Icon name={it.icon} fallback="Wrench" size={15} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[0.86em]">{it.label}</span>
                          <span className="block truncate text-[0.74em] text-muted-foreground">
                            {r?.lastAt ? `было ${ruDate(r.lastAt)}` : 'ещё не отмечено'}
                            {r?.nextAt ? ` · следующее ${ruDate(r.nextAt)}` : ''}
                          </span>
                        </span>
                        {left !== null && (
                          <span
                            className={cn(
                              'flex-none rounded-sm border px-2 py-0.5 text-[0.7em] uppercase tracking-[0.06em]',
                              left < 0
                                ? 'border-destructive text-destructive'
                                : left <= 14
                                  ? 'border-amber-500 text-amber-600'
                                  : 'border-emerald-600 text-emerald-600',
                            )}
                          >
                            {left < 0 ? `просрочено ${-left} дн.` : `через ${left} дн.`}
                          </span>
                        )}
                        <Icon
                          name="ChevronRight"
                          size={15}
                          className="flex-none text-muted-foreground"
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              {vehicle.note && (
                <p className="rounded-sm border border-border bg-secondary/30 p-2.5 text-[0.82em] text-muted-foreground">
                  {vehicle.note}
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!edit} onOpenChange={(v) => !v && setEdit(null)}>
        <DialogContent className="max-w-sm rounded-sm">
          <DialogHeader>
            <DialogTitle className="font-head text-[1.1em] uppercase tracking-[0.03em]">
              {MAINT_ITEMS.find((x) => x.key === edit)?.label}
            </DialogTitle>
            <DialogDescription>
              Отметьте, когда было сделано и когда нужно повторить.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3.5">
            <div className="space-y-1.5">
              <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
                Когда было
              </Label>
              <Input
                type="date"
                value={lastAt}
                onChange={(e) => setLastAt(e.target.value)}
                className="rounded-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
                Когда следующее
              </Label>
              <Input
                type="date"
                value={nextAt}
                onChange={(e) => setNextAt(e.target.value)}
                className="rounded-sm"
              />
            </div>
            <Button
              onClick={save}
              disabled={busy}
              className="w-full gap-2 rounded-sm bg-accent font-head uppercase tracking-[0.06em] text-accent-foreground hover:bg-accent/90"
            >
              <Icon
                name={busy ? 'Loader2' : 'Check'}
                size={16}
                className={busy ? 'animate-spin' : ''}
              />
              {busy ? 'Сохраняем…' : 'Сохранить'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CarDialog;
