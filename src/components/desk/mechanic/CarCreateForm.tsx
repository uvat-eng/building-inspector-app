import { useEffect, useState } from 'react';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useProfile } from '@/data/profile';
import { useLocations } from '@/data/locations';
import {
  KIND_ICON,
  KIND_LABEL,
  Vehicle,
  VehicleDraft,
  VehicleKind,
  VehicleStatus,
} from '@/data/vehicles';

const KINDS = Object.keys(KIND_LABEL) as VehicleKind[];
const STATUSES: VehicleStatus[] = ['На линии', 'ТО', 'Ремонт', 'Стоянка'];

type Tab = 'base' | 'tech' | 'state' | 'service';

const TABS: { k: Tab; l: string; i: string }[] = [
  { k: 'base', l: 'Основное', i: 'Truck' },
  { k: 'tech', l: 'Характеристики', i: 'Cog' },
  { k: 'state', l: 'Состояние', i: 'Activity' },
  { k: 'service', l: 'ТО и ремонты', i: 'Wrench' },
];

export interface CarCreateFormProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: Vehicle | null;
  onSubmit: (draft: VehicleDraft & Record<string, unknown>) => Promise<void> | void;
}

const CarCreateForm = ({ open, onOpenChange, initial, onSubmit }: CarCreateFormProps) => {
  const { toast } = useToast();
  const { profile } = useProfile();
  const { list: locations } = useLocations();

  const [tab, setTab] = useState<Tab>('base');
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({
    plate: '',
    model: '',
    kind: 'truck' as VehicleKind,
    driver: '',
    locationId: '',
    status: 'На линии' as VehicleStatus,
    odometer: '',
    fuelNorm: '',
    serviceAt: '',
    osagoTo: '',
    note: '',
    vin: '',
    yearMade: '',
    engine: '',
    transmission: '',
    tyres: '',
    fuelKind: '',
    tank: '',
    condition: '',
    pastRepairs: '',
    nextService: '',
    techTo: '',
  });

  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));

  useEffect(() => {
    if (!open) return;
    setTab('base');
    setF({
      plate: initial?.plate ?? '',
      model: initial?.model ?? '',
      kind: initial?.kind ?? 'truck',
      driver: initial?.driver ?? '',
      locationId: initial?.locationId ?? '',
      status: initial?.status ?? 'На линии',
      odometer: initial?.odometer ? String(initial.odometer) : '',
      fuelNorm: initial?.fuelNorm ? String(initial.fuelNorm) : '',
      serviceAt: initial?.serviceAt?.slice(0, 10) ?? '',
      osagoTo: initial?.osagoTo?.slice(0, 10) ?? '',
      note: initial?.note ?? '',
      vin: initial?.vin ?? '',
      yearMade: initial?.yearMade ?? '',
      engine: initial?.engine ?? '',
      transmission: initial?.transmission ?? '',
      tyres: initial?.tyres ?? '',
      fuelKind: initial?.fuelKind ?? '',
      tank: initial?.tank ? String(initial.tank) : '',
      condition: initial?.condition ?? '',
      pastRepairs: initial?.pastRepairs ?? '',
      nextService: initial?.nextService ?? '',
      techTo: initial?.techTo?.slice(0, 10) ?? '',
    });
  }, [open, initial]);

  const save = async () => {
    if (!f.plate.trim() || !f.model.trim()) {
      toast({ title: 'Укажите госномер и модель', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      await onSubmit({
        ...f,
        vehicleKind: f.kind,
        odometer: Number(f.odometer || 0),
        fuelNorm: Number(f.fuelNorm || 0),
        tank: Number(f.tank || 0),
        assetType: 'vehicle',
        createdBy: profile.fio,
      } as VehicleDraft & Record<string, unknown>);
      onOpenChange(false);
    } catch {
      toast({ title: 'Не удалось сохранить', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const field = (
    label: string,
    key: keyof typeof f,
    opts: { type?: string; ph?: string; mode?: 'numeric' | 'decimal' } = {},
  ) => (
    <div className="space-y-1.5">
      <Label className="text-[0.72em] uppercase tracking-[0.09em] text-muted-foreground">
        {label}
      </Label>
      <Input
        type={opts.type}
        inputMode={opts.mode}
        value={f[key] as string}
        onChange={(e) => set({ [key]: e.target.value } as Partial<typeof f>)}
        placeholder={opts.ph}
        className="rounded-sm"
      />
    </div>
  );

  const area = (label: string, key: keyof typeof f, ph: string) => (
    <div className="space-y-1.5">
      <Label className="text-[0.72em] uppercase tracking-[0.09em] text-muted-foreground">
        {label}
      </Label>
      <Textarea
        value={f[key] as string}
        onChange={(e) => set({ [key]: e.target.value } as Partial<typeof f>)}
        rows={3}
        placeholder={ph}
        className="rounded-sm"
      />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto rounded-sm">
        <DialogHeader>
          <DialogTitle className="font-head text-[1.2em] uppercase tracking-[0.03em]">
            {initial ? 'Карточка автомобиля' : 'Создать автомобиль'}
          </DialogTitle>
          <DialogDescription>
            Базовые данные, характеристики, состояние и история — вносит механик.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-1.5">
          {TABS.map((t) => (
            <button
              key={t.k}
              type="button"
              onClick={() => setTab(t.k)}
              className={cn(
                'flex items-center gap-1.5 rounded-sm border px-2.5 py-1.5 text-[0.78em] font-head uppercase tracking-[0.05em] transition-colors',
                tab === t.k
                  ? 'border-accent bg-accent text-accent-foreground'
                  : 'border-border bg-card hover:bg-secondary',
              )}
            >
              <Icon name={t.i} size={14} />
              {t.l}
            </button>
          ))}
        </div>

        <div className="space-y-3.5 pt-1">
          {tab === 'base' && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                {field('Государственный номер', 'plate', { ph: 'Х123ХХ72' })}
                {field('Марка, модель', 'model', { ph: 'ТРЭКОЛ 39294' })}
              </div>

              <div className="space-y-1.5">
                <Label className="text-[0.72em] uppercase tracking-[0.09em] text-muted-foreground">
                  Тип техники
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {KINDS.map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => set({ kind: k })}
                      className={cn(
                        'flex items-center gap-1.5 rounded-sm border px-2.5 py-1.5 text-[0.8em] transition-colors',
                        f.kind === k
                          ? 'border-accent bg-accent text-accent-foreground'
                          : 'border-input hover:bg-secondary',
                      )}
                    >
                      <Icon name={KIND_ICON[k]} fallback="Truck" size={14} />
                      {KIND_LABEL[k]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[0.72em] uppercase tracking-[0.09em] text-muted-foreground">
                  Локация
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {locations.map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() =>
                        set({ locationId: f.locationId === l.id ? '' : l.id })
                      }
                      className={cn(
                        'max-w-[12rem] truncate rounded-sm border px-2 py-1 text-[0.8em] transition-colors',
                        f.locationId === l.id
                          ? 'border-accent bg-accent text-accent-foreground'
                          : 'border-input hover:bg-secondary',
                      )}
                    >
                      {l.title}
                    </button>
                  ))}
                </div>
              </div>

              {field('Закреплённый водитель', 'driver', { ph: 'Фамилия Имя Отчество' })}
            </>
          )}

          {tab === 'tech' && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                {field('VIN', 'vin')}
                {field('Год выпуска', 'yearMade', { mode: 'numeric', ph: '2021' })}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {field('Двигатель', 'engine', { ph: 'ЗМЗ-409, 2.7 л, бензин' })}
                {field('Коробка передач', 'transmission', { ph: 'МКПП 5-ст.' })}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {field('Шины', 'tyres', { ph: 'ТРЭКОЛ 1300х600-533' })}
                {field('Вид топлива', 'fuelKind', { ph: 'АИ-92 / ДТ' })}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {field('Объём бака, л', 'tank', { mode: 'numeric' })}
                {field('Норма расхода, л/100 км', 'fuelNorm', { mode: 'decimal' })}
              </div>
            </>
          )}

          {tab === 'state' && (
            <>
              <div className="space-y-1.5">
                <Label className="text-[0.72em] uppercase tracking-[0.09em] text-muted-foreground">
                  Текущий статус
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {STATUSES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => set({ status: s })}
                      className={cn(
                        'rounded-sm border px-2.5 py-1.5 text-[0.8em] transition-colors',
                        f.status === s
                          ? 'border-accent bg-accent text-accent-foreground'
                          : 'border-input hover:bg-secondary',
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {field('Пробег, км', 'odometer', { mode: 'numeric' })}
                {field('ОСАГО до', 'osagoTo', { type: 'date' })}
              </div>
              {area(
                'Текущее техническое состояние',
                'condition',
                'Кузов без повреждений, резина летняя, аккумулятор заменён в мае',
              )}
              {area('Примечание', 'note', 'Особенности эксплуатации, комплектация')}
            </>
          )}

          {tab === 'service' && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                {field('Ближайшее ТО', 'serviceAt', { type: 'date' })}
                {field('Техосмотр до', 'techTo', { type: 'date' })}
              </div>
              {area(
                'Прошлые ремонты',
                'pastRepairs',
                'Март 2026 — замена сцепления. Июнь 2026 — ремонт редуктора моста',
              )}
              {area(
                'План будущих ТО',
                'nextService',
                'ТО-2 при 60 000 км, замена масла ГУР осенью',
              )}
            </>
          )}

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
            {busy ? 'Сохраняем…' : initial ? 'Сохранить' : 'Создать автомобиль'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CarCreateForm;
