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
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useProfile } from '@/data/profile';
import { Vehicle } from '@/data/vehicles';
import {
  ORG_DEFAULT,
  WbTask,
  WbWork,
  createWaybill,
  useWaybills,
} from '@/data/waybills';

interface WaybillSheetFormProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  vehicles: Vehicle[];
  defaultVehicle?: string;
}

type Step = 'head' | 'car' | 'work' | 'fuel' | 'task' | 'control';

const STEPS: { k: Step; l: string; i: string }[] = [
  { k: 'head', l: 'Шапка', i: 'FileText' },
  { k: 'car', l: 'Автомобиль', i: 'Truck' },
  { k: 'work', l: 'Работа', i: 'Gauge' },
  { k: 'fuel', l: 'Горючее', i: 'Fuel' },
  { k: 'task', l: 'Задание', i: 'ClipboardList' },
  { k: 'control', l: 'Контроль', i: 'ShieldCheck' },
];

const emptyTask: WbTask = { customer: '', arrive: '', leave: '', work: '' };
const emptyWork: WbWork = {
  route: '',
  work: '',
  arrive: '',
  leave: '',
  odoIn: '',
  odoOut: '',
};

const WaybillSheetForm = ({
  open,
  onOpenChange,
  vehicles,
  defaultVehicle,
}: WaybillSheetFormProps) => {
  const { toast } = useToast();
  const { profile } = useProfile();
  const { reload } = useWaybills();

  const [step, setStep] = useState<Step>('head');
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({
    vehicleId: defaultVehicle ?? '',
    number: '',
    series: '',
    wbDate: new Date().toISOString().slice(0, 10),
    validFrom: '',
    validTo: '',
    org: ORG_DEFAULT,
    customer: '',
    customerPerson: '',
    columnNo: '',
    brigade: '',
    carModel: '',
    carPlate: '',
    trailerModel: '',
    trailerPlate: '',
    driverFio: profile.fio,
    tabNo: '',
    license: '',
    driverClass: '',
    snils: '',
    transportKind: 'перевозка для собственных нужд',
    messageKind: 'междугороднее сообщение',
    departAt: '',
    returnAt: '',
    odoOut: '',
    odoIn: '',
    zeroRun: '',
    fuelBrand: '',
    fuelIssued: '',
    fuelOut: '',
    fuelIn: '',
    fuelReturned: '',
    fuelNorm: '',
    fuelFact: '',
    medBefore: '',
    medAfter: '',
    techBefore: '',
    techAfter: '',
    dispatcher: '',
    notes: '',
  });
  const [tasks, setTasks] = useState<WbTask[]>([{ ...emptyTask }]);
  const [works, setWorks] = useState<WbWork[]>([{ ...emptyWork }]);

  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));

  useEffect(() => {
    if (!open) return;
    const v = vehicles.find((x) => x.id === (defaultVehicle ?? '')) ?? vehicles[0];
    if (v) {
      setF((x) => ({
        ...x,
        vehicleId: v.id,
        carModel: v.model || '',
        carPlate: v.plate || '',
        odoOut: String(v.odometer || ''),
        fuelNorm: '',
        driverFio: profile.fio,
      }));
    }
  }, [open, defaultVehicle, vehicles, profile.fio]);

  const pickCar = (v: Vehicle) =>
    set({
      vehicleId: v.id,
      carModel: v.model || '',
      carPlate: v.plate || '',
      odoOut: String(v.odometer || ''),
    });

  const run = Math.max(0, Number(f.odoIn || 0) - Number(f.odoOut || 0));

  const save = async () => {
    if (!f.number.trim() || !f.wbDate) {
      toast({ title: 'Укажите номер и дату путевого листа', variant: 'destructive' });
      return;
    }
    if (!f.carPlate.trim()) {
      toast({ title: 'Выберите автомобиль', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      await createWaybill({
        ...f,
        tasks: tasks.filter((t) => t.customer.trim() || t.work.trim()),
        works: works.filter((w) => w.route.trim() || w.work.trim()),
        author: profile.fio,
        status: 'open',
      });
      toast({ title: 'Путевой лист создан', description: `№ ${f.number}` });
      onOpenChange(false);
      setStep('head');
      setTasks([{ ...emptyTask }]);
      setWorks([{ ...emptyWork }]);
      reload();
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-sm">
        <DialogHeader>
          <DialogTitle className="font-head text-[1.2em] uppercase tracking-[0.03em]">
            Путевой лист специального автомобиля
          </DialogTitle>
          <DialogDescription>
            Заполняйте по разделам — форма повторяет бланк, потом выгрузится в Excel.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-1.5">
          {STEPS.map((s) => (
            <button
              key={s.k}
              type="button"
              onClick={() => setStep(s.k)}
              className={cn(
                'flex items-center gap-1.5 rounded-sm border px-2.5 py-1.5 text-[0.78em] font-head uppercase tracking-[0.05em] transition-colors',
                step === s.k
                  ? 'border-accent bg-accent text-accent-foreground'
                  : 'border-border bg-card hover:bg-secondary',
              )}
            >
              <Icon name={s.i} size={14} />
              {s.l}
            </button>
          ))}
        </div>

        <div className="space-y-3.5 pt-1">
          {step === 'head' && (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                {field('Номер', 'number', { ph: '14' })}
                {field('Серия', 'series', { ph: 'ГСИ' })}
                {field('Дата', 'wbDate', { type: 'date' })}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {field('Срок действия с', 'validFrom', { type: 'date' })}
                {field('по', 'validTo', { type: 'date' })}
              </div>
              <div className="space-y-1.5">
                <Label className="text-[0.72em] uppercase tracking-[0.09em] text-muted-foreground">
                  Организация
                </Label>
                <Textarea
                  value={f.org}
                  onChange={(e) => set({ org: e.target.value })}
                  rows={2}
                  className="rounded-sm"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {field('Заказчик', 'customer', { ph: 'Газпромнефть-Заполярье' })}
                {field('Ответственное лицо', 'customerPerson', { ph: 'Фамилия И.О.' })}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {field('Колонна', 'columnNo')}
                {field('Бригада', 'brigade')}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {field('Вид перевозки', 'transportKind')}
                {field('Вид сообщения', 'messageKind')}
              </div>
            </>
          )}

          {step === 'car' && (
            <>
              <div className="space-y-1.5">
                <Label className="text-[0.72em] uppercase tracking-[0.09em] text-muted-foreground">
                  Выберите автомобиль
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {vehicles.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => pickCar(v)}
                      className={cn(
                        'max-w-[15rem] truncate rounded-sm border px-2 py-1 text-[0.8em] transition-colors',
                        f.vehicleId === v.id
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
                {field('Марка, модель', 'carModel')}
                {field('Государственный номер', 'carPlate')}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {field('Марка прицепа', 'trailerModel')}
                {field('Номер прицепа', 'trailerPlate')}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {field('Водитель', 'driverFio')}
                {field('Табельный номер', 'tabNo')}
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {field('Удостоверение', 'license', { ph: 'серия, номер, дата' })}
                {field('Класс', 'driverClass')}
                {field('СНИЛС', 'snils')}
              </div>
            </>
          )}

          {step === 'work' && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                {field('Выезд с парковки', 'departAt', { type: 'datetime-local' })}
                {field('Возвращение на парковку', 'returnAt', { type: 'datetime-local' })}
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {field('Одометр при выезде, км', 'odoOut', { mode: 'numeric' })}
                {field('Одометр при возвращении, км', 'odoIn', { mode: 'numeric' })}
                {field('Нулевой пробег, км', 'zeroRun', { mode: 'numeric' })}
              </div>
              <p className="rounded-sm border border-border bg-secondary/40 px-3 py-2.5 text-[0.84em]">
                Пробег за смену: <span className="font-head">{run}</span> км
              </p>
            </>
          )}

          {step === 'fuel' && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                {field('Марка горючего', 'fuelBrand', { ph: 'ДТ' })}
                {field('Выдано, л', 'fuelIssued', { mode: 'decimal' })}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {field('Остаток при выезде, л', 'fuelOut', { mode: 'decimal' })}
                {field('Остаток при возвращении, л', 'fuelIn', { mode: 'decimal' })}
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {field('Сдано, л', 'fuelReturned', { mode: 'decimal' })}
                {field('Расход по норме, л', 'fuelNorm', { mode: 'decimal' })}
                {field('Расход фактический, л', 'fuelFact', { mode: 'decimal' })}
              </div>
            </>
          )}

          {step === 'task' && (
            <>
              <div className="space-y-1.5">
                <Label className="text-[0.72em] uppercase tracking-[0.09em] text-muted-foreground">
                  Задание водителю
                </Label>
                {tasks.map((t, i) => (
                  <div
                    key={i}
                    className="flex flex-col gap-1.5 rounded-sm border border-border p-2"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="w-5 flex-none text-[0.78em] text-muted-foreground">
                        {i + 1}
                      </span>
                      <Input
                        value={t.customer}
                        onChange={(e) =>
                          setTasks((p) =>
                            p.map((x, k) => (k === i ? { ...x, customer: e.target.value } : x)),
                          )
                        }
                        placeholder="В чьё распоряжение"
                        className="flex-1 rounded-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setTasks((p) => p.filter((_, k) => k !== i))}
                        className="flex h-8 w-8 flex-none items-center justify-center rounded-sm border border-border text-muted-foreground hover:border-destructive hover:text-destructive"
                      >
                        <Icon name="X" size={13} />
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 pl-6">
                      <Input
                        type="time"
                        value={t.arrive}
                        onChange={(e) =>
                          setTasks((p) =>
                            p.map((x, k) => (k === i ? { ...x, arrive: e.target.value } : x)),
                          )
                        }
                        className="rounded-sm"
                      />
                      <Input
                        type="time"
                        value={t.leave}
                        onChange={(e) =>
                          setTasks((p) =>
                            p.map((x, k) => (k === i ? { ...x, leave: e.target.value } : x)),
                          )
                        }
                        className="rounded-sm"
                      />
                      <Input
                        value={t.work}
                        onChange={(e) =>
                          setTasks((p) =>
                            p.map((x, k) => (k === i ? { ...x, work: e.target.value } : x)),
                          )
                        }
                        placeholder="Вид работы"
                        className="rounded-sm"
                      />
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setTasks((p) => [...p, { ...emptyTask }])}
                  className="flex items-center gap-1.5 rounded-sm border border-dashed border-border px-2.5 py-1.5 text-[0.8em] hover:border-accent hover:text-accent"
                >
                  <Icon name="Plus" size={13} />
                  Добавить задание
                </button>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[0.72em] uppercase tracking-[0.09em] text-muted-foreground">
                  Сведения о выполненной работе
                </Label>
                {works.map((w, i) => (
                  <div
                    key={i}
                    className="flex flex-col gap-1.5 rounded-sm border border-border p-2"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="w-5 flex-none text-[0.78em] text-muted-foreground">
                        {i + 1}
                      </span>
                      <Input
                        value={w.route}
                        onChange={(e) =>
                          setWorks((p) =>
                            p.map((x, k) => (k === i ? { ...x, route: e.target.value } : x)),
                          )
                        }
                        placeholder="Маршрут движения или объект"
                        className="flex-1 rounded-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setWorks((p) => p.filter((_, k) => k !== i))}
                        className="flex h-8 w-8 flex-none items-center justify-center rounded-sm border border-border text-muted-foreground hover:border-destructive hover:text-destructive"
                      >
                        <Icon name="X" size={13} />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 pl-6 sm:grid-cols-5">
                      <Input
                        value={w.work}
                        onChange={(e) =>
                          setWorks((p) =>
                            p.map((x, k) => (k === i ? { ...x, work: e.target.value } : x)),
                          )
                        }
                        placeholder="Вид работы"
                        className="rounded-sm sm:col-span-1"
                      />
                      <Input
                        type="time"
                        value={w.arrive}
                        onChange={(e) =>
                          setWorks((p) =>
                            p.map((x, k) => (k === i ? { ...x, arrive: e.target.value } : x)),
                          )
                        }
                        className="rounded-sm"
                      />
                      <Input
                        type="time"
                        value={w.leave}
                        onChange={(e) =>
                          setWorks((p) =>
                            p.map((x, k) => (k === i ? { ...x, leave: e.target.value } : x)),
                          )
                        }
                        className="rounded-sm"
                      />
                      <Input
                        value={w.odoIn}
                        onChange={(e) =>
                          setWorks((p) =>
                            p.map((x, k) => (k === i ? { ...x, odoIn: e.target.value } : x)),
                          )
                        }
                        placeholder="одометр приб."
                        inputMode="numeric"
                        className="rounded-sm"
                      />
                      <Input
                        value={w.odoOut}
                        onChange={(e) =>
                          setWorks((p) =>
                            p.map((x, k) => (k === i ? { ...x, odoOut: e.target.value } : x)),
                          )
                        }
                        placeholder="одометр убыт."
                        inputMode="numeric"
                        className="rounded-sm"
                      />
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setWorks((p) => [...p, { ...emptyWork }])}
                  className="flex items-center gap-1.5 rounded-sm border border-dashed border-border px-2.5 py-1.5 text-[0.8em] hover:border-accent hover:text-accent"
                >
                  <Icon name="Plus" size={13} />
                  Добавить строку работы
                </button>
              </div>
            </>
          )}

          {step === 'control' && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                {field('Предрейсовый медосмотр', 'medBefore', { ph: 'дата, время, врач' })}
                {field('Послерейсовый медосмотр', 'medAfter', { ph: 'дата, время, врач' })}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {field('Предрейсовый контроль ТС', 'techBefore', { ph: 'дата, время, механик' })}
                {field('Возвращение ТС', 'techAfter', { ph: 'дата, время, принял' })}
              </div>
              {field('Диспетчер', 'dispatcher')}
              <div className="space-y-1.5">
                <Label className="text-[0.72em] uppercase tracking-[0.09em] text-muted-foreground">
                  Особые отметки
                </Label>
                <Textarea
                  value={f.notes}
                  onChange={(e) => set({ notes: e.target.value })}
                  rows={3}
                  className="rounded-sm"
                />
              </div>
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
            {busy ? 'Сохраняем…' : 'Создать путевой лист'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WaybillSheetForm;
