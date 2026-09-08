import { useMemo, useRef, useState } from 'react';
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
  ActItem,
  ExpenseSource,
  SOURCE_LABEL,
  createFleet,
  readPhotos,
  useFleet,
} from '@/data/fleet';

export type DriverAction = 'repair' | 'expense' | 'writeoff' | 'handover' | null;

interface DriverActionsProps {
  action: DriverAction;
  onClose: () => void;
  vehicles: Vehicle[];
  defaultVehicle?: string;
}

const emptyItem: ActItem = { title: '', qty: '1', unit: 'шт', note: '' };

const DriverActions = ({ action, onClose, vehicles, defaultVehicle }: DriverActionsProps) => {
  const { toast } = useToast();
  const { profile } = useProfile();
  const { expenses, reload } = useFleet();

  const [vehicleId, setVehicleId] = useState(defaultVehicle ?? vehicles[0]?.id ?? '');
  const [date, setDate] = useState('');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [qty, setQty] = useState('1');
  const [unit, setUnit] = useState('шт');
  const [source, setSource] = useState<ExpenseSource>('podotchet');
  const [parts, setParts] = useState('');
  const [note, setNote] = useState('');
  const [odometer, setOdometer] = useState('');
  const [actNo, setActNo] = useState('');
  const [acceptFio, setAcceptFio] = useState('');
  const [condition, setCondition] = useState('');
  const [items, setItems] = useState<ActItem[]>([{ ...emptyItem }]);
  const [photos, setPhotos] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);

  const myExpenses = useMemo(
    () => expenses.filter((e) => e.driverFio === profile.fio),
    [expenses, profile.fio],
  );

  const reset = () => {
    setDate('');
    setTitle('');
    setAmount('');
    setQty('1');
    setUnit('шт');
    setParts('');
    setNote('');
    setOdometer('');
    setActNo('');
    setAcceptFio('');
    setCondition('');
    setItems([{ ...emptyItem }]);
    setPhotos([]);
  };

  const setItem = (i: number, patch: Partial<ActItem>) =>
    setItems((p) => p.map((x, k) => (k === i ? { ...x, ...patch } : x)));

  const save = async () => {
    if (!vehicleId) {
      toast({ title: 'Выберите технику', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      const shots = photos.length ? await readPhotos(photos) : [];

      if (action === 'repair') {
        if (!title.trim() || !date) {
          toast({ title: 'Укажите что сделано и дату', variant: 'destructive' });
          setBusy(false);
          return;
        }
        await createFleet('repair', {
          vehicleId,
          repairKind: 'repair',
          title: title.trim(),
          repairDate: date,
          odometer,
          amount,
          parts: parts.trim(),
          note: note.trim(),
          photos: shots,
          author: profile.fio,
          authorRole: 'driver',
        });
        toast({ title: 'Ремонт записан', description: 'Механик увидит его в досье техники.' });
      } else if (action === 'expense') {
        if (!title.trim() || !amount.trim()) {
          toast({ title: 'Укажите что купили и сумму', variant: 'destructive' });
          setBusy(false);
          return;
        }
        await createFleet('expense', {
          vehicleId,
          driverFio: profile.fio,
          expDate: date,
          source,
          title: title.trim(),
          amount,
          qty,
          unit,
          note: note.trim(),
          photos: shots,
          author: profile.fio,
        });
        toast({ title: 'Авансовый отчёт отправлен' });
      } else {
        const clean = items.filter((x) => x.title.trim());
        if (!clean.length) {
          toast({ title: 'Добавьте хотя бы одну позицию', variant: 'destructive' });
          setBusy(false);
          return;
        }
        await createFleet('act', {
          vehicleId,
          actKind: action === 'writeoff' ? 'writeoff' : 'handover',
          actNo: actNo.trim(),
          actDate: date,
          driverFio: profile.fio,
          acceptFio: acceptFio.trim(),
          odometer,
          condition: condition.trim(),
          items: clean,
          note: note.trim(),
          photos: shots,
          author: profile.fio,
        });
        toast({
          title: action === 'writeoff' ? 'Ведомость создана' : 'Акт передачи вахты создан',
          description: 'Документ ушёл механику.',
        });
      }
      reset();
      onClose();
      reload();
    } catch {
      toast({ title: 'Не удалось сохранить', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const meta = {
    repair: {
      t: 'Сделал ремонт',
      d: 'Опишите работу и приложите фото — запись попадёт механику.',
    },
    expense: {
      t: 'Авансовый отчёт',
      d: 'Отметьте, выдано в подотчёт или куплено за свои. Приложите чек.',
    },
    writeoff: {
      t: 'Ведомость на списание',
      d: 'Перечислите переданные и использованные запчасти и материалы.',
    },
    handover: {
      t: 'Акт передачи вахты',
      d: 'Опись запчастей и материалов, состояние техники и фото.',
    },
  }[action ?? 'repair'];

  const isAct = action === 'writeoff' || action === 'handover';

  return (
    <Dialog open={!!action} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[88vh] max-w-lg overflow-y-auto rounded-sm">
        <DialogHeader>
          <DialogTitle className="font-head text-[1.2em] uppercase tracking-[0.03em]">
            {meta.t}
          </DialogTitle>
          <DialogDescription>{meta.d}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5">
          <div className="space-y-1.5">
            <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
              Техника
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {vehicles.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setVehicleId(v.id)}
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

          {action === 'expense' && (
            <div className="flex gap-1.5">
              {(['podotchet', 'own'] as ExpenseSource[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSource(s)}
                  className={cn(
                    'flex-1 rounded-sm border px-3 py-2 text-[0.82em] transition-colors',
                    source === s
                      ? 'border-accent bg-accent text-accent-foreground'
                      : 'border-input hover:bg-secondary',
                  )}
                >
                  {SOURCE_LABEL[s]}
                </button>
              ))}
            </div>
          )}

          {!isAct && (
            <div className="space-y-1.5">
              <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
                {action === 'repair' ? 'Что сделано' : 'Что приобретено'}
              </Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={
                  action === 'repair' ? 'Замена тормозных колодок' : 'Масло моторное 5W40'
                }
                className="rounded-sm"
              />
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
                Дата
              </Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="rounded-sm"
              />
            </div>
            {action === 'expense' ? (
              <>
                <div className="space-y-1.5">
                  <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
                    Количество
                  </Label>
                  <Input
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                    inputMode="decimal"
                    className="rounded-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
                    Сумма, ₽
                  </Label>
                  <Input
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    inputMode="decimal"
                    className="rounded-sm"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
                    Пробег, км
                  </Label>
                  <Input
                    value={odometer}
                    onChange={(e) => setOdometer(e.target.value)}
                    inputMode="numeric"
                    className="rounded-sm"
                  />
                </div>
                {action === 'repair' ? (
                  <div className="space-y-1.5">
                    <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
                      Сумма, ₽
                    </Label>
                    <Input
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      inputMode="decimal"
                      className="rounded-sm"
                    />
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
                      Номер акта
                    </Label>
                    <Input
                      value={actNo}
                      onChange={(e) => setActNo(e.target.value)}
                      className="rounded-sm"
                    />
                  </div>
                )}
              </>
            )}
          </div>

          {action === 'repair' && (
            <div className="space-y-1.5">
              <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
                Запчасти и материалы
              </Label>
              <Textarea
                value={parts}
                onChange={(e) => setParts(e.target.value)}
                rows={2}
                className="rounded-sm"
              />
            </div>
          )}

          {isAct && (
            <>
              {action === 'handover' && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
                      Кому передаю
                    </Label>
                    <Input
                      value={acceptFio}
                      onChange={(e) => setAcceptFio(e.target.value)}
                      placeholder="Сидоров Иван"
                      className="rounded-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
                      Состояние техники
                    </Label>
                    <Input
                      value={condition}
                      onChange={(e) => setCondition(e.target.value)}
                      placeholder="Исправна, замечаний нет"
                      className="rounded-sm"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
                  Опись позиций
                </Label>
                <div className="flex flex-col gap-1.5">
                  {items.map((it, i) => (
                    <div key={i} className="flex flex-wrap items-center gap-1.5">
                      <span className="w-5 flex-none text-[0.78em] text-muted-foreground">
                        {i + 1}
                      </span>
                      <Input
                        value={it.title}
                        onChange={(e) => setItem(i, { title: e.target.value })}
                        placeholder="Наименование"
                        className="min-w-[9rem] flex-1 rounded-sm"
                      />
                      <Input
                        value={it.qty}
                        onChange={(e) => setItem(i, { qty: e.target.value })}
                        className="w-16 flex-none rounded-sm"
                        inputMode="decimal"
                      />
                      <Input
                        value={it.unit}
                        onChange={(e) => setItem(i, { unit: e.target.value })}
                        className="w-16 flex-none rounded-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setItems((p) => p.filter((_, k) => k !== i))}
                        className="flex h-8 w-8 flex-none items-center justify-center rounded-sm border border-border text-muted-foreground transition-colors hover:border-destructive hover:text-destructive"
                      >
                        <Icon name="X" size={13} />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setItems((p) => [...p, { ...emptyItem }])}
                  className="flex items-center gap-1.5 rounded-sm border border-dashed border-border px-2.5 py-1.5 text-[0.8em] transition-colors hover:border-accent hover:text-accent"
                >
                  <Icon name="Plus" size={13} />
                  Добавить позицию
                </button>
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
              {action === 'expense' ? 'Фото чека' : 'Фото'}
            </Label>
            <input
              ref={photoRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => setPhotos([...(e.target.files ?? [])])}
            />
            <button
              type="button"
              onClick={() => photoRef.current?.click()}
              className="flex w-full items-center gap-2 rounded-sm border border-dashed border-border px-3 py-3 text-left text-[0.84em] transition-colors hover:border-accent"
            >
              <Icon
                name={photos.length ? 'ImageUp' : 'Camera'}
                size={17}
                className="flex-none text-accent"
              />
              <span className="min-w-0 truncate">
                {photos.length ? `Выбрано фото: ${photos.length}` : 'Сделать или выбрать фото'}
              </span>
            </button>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
              Примечание
            </Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="rounded-sm"
            />
          </div>

          {action === 'expense' && myExpenses.length > 0 && (
            <p className="text-[0.78em] text-muted-foreground">
              Ранее вы сдали отчётов: {myExpenses.length}
            </p>
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
            {busy ? 'Отправляем…' : 'Отправить механику'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DriverActions;
