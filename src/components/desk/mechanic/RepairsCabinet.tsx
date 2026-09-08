import { useMemo, useRef, useState } from 'react';
import Panel from '@/components/desk/Panel';
import Empty from '@/components/desk/Empty';
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
  FleetRepair,
  REPAIR_LABEL,
  RepairKind,
  createFleet,
  money,
  readPhotos,
  removeFleet,
  ruDate,
  useFleet,
  ymTitle,
} from '@/data/fleet';

interface RepairsCabinetProps {
  vehicles: Vehicle[];
  canEdit?: boolean;
}

const RepairsCabinet = ({ vehicles, canEdit = true }: RepairsCabinetProps) => {
  const { toast } = useToast();
  const { profile } = useProfile();
  const { repairs, loading, reload } = useFleet();

  const [form, setForm] = useState(false);
  const [kind, setKind] = useState<RepairKind>('repair');
  const [vehicleId, setVehicleId] = useState('');
  const [title, setTitle] = useState('');
  const [repairDate, setRepairDate] = useState('');
  const [odometer, setOdometer] = useState('');
  const [amount, setAmount] = useState('');
  const [parts, setParts] = useState('');
  const [note, setNote] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [openYm, setOpenYm] = useState<string | null>(null);
  const photoRef = useRef<HTMLInputElement>(null);

  const vTitle = (id: string) => {
    const v = vehicles.find((x) => x.id === id);
    return v ? `${v.plate || 'б/н'} · ${v.model}` : 'Техника удалена';
  };

  const stats = useMemo(() => {
    const total = repairs.length;
    const svc = repairs.filter((r) => r.kind === 'service');
    const rep = repairs.filter((r) => r.kind === 'repair');
    const sum = repairs.reduce((s, r) => s + (r.amount || 0), 0);
    const byVehicle = new Map<string, { count: number; sum: number }>();
    repairs.forEach((r) => {
      const prev = byVehicle.get(r.vehicleId) ?? { count: 0, sum: 0 };
      byVehicle.set(r.vehicleId, { count: prev.count + 1, sum: prev.sum + (r.amount || 0) });
    });
    const top = [...byVehicle.entries()]
      .sort((a, b) => b[1].sum - a[1].sum)
      .slice(0, 5);
    return { total, svc: svc.length, rep: rep.length, sum, top };
  }, [repairs]);

  const byMonth = useMemo(() => {
    const map = new Map<string, FleetRepair[]>();
    repairs.forEach((r) => {
      const k = r.ym || 'Без даты';
      map.set(k, [...(map.get(k) ?? []), r]);
    });
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [repairs]);

  const save = async () => {
    if (!vehicleId || !repairDate) {
      toast({ title: 'Выберите технику и дату', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      await createFleet('repair', {
        vehicleId,
        repairKind: kind,
        title: title.trim(),
        repairDate,
        odometer,
        amount,
        parts: parts.trim(),
        note: note.trim(),
        photos: photos.length ? await readPhotos(photos) : [],
        author: profile.fio,
        authorRole: profile.role,
      });
      toast({ title: kind === 'service' ? 'ТО записано' : 'Ремонт записан' });
      setForm(false);
      setTitle('');
      setRepairDate('');
      setOdometer('');
      setAmount('');
      setParts('');
      setNote('');
      setPhotos([]);
      reload();
    } catch {
      toast({ title: 'Не удалось сохранить', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const drop = async (id: string) => {
    await removeFleet('repair', id);
    reload();
  };

  const counters = [
    { label: 'Всего записей', value: String(stats.total), icon: 'Wrench' },
    { label: 'Проведено ТО', value: String(stats.svc), icon: 'CalendarCheck' },
    { label: 'Ремонтов', value: String(stats.rep), icon: 'Hammer' },
    { label: 'Затраты, ₽', value: money(stats.sum), icon: 'Wallet' },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="grid flex-none gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {counters.map((c) => (
          <div
            key={c.label}
            className="flex items-center gap-3 rounded-sm border border-border bg-card px-4 py-3.5"
          >
            <span className="flex h-10 w-10 flex-none items-center justify-center rounded-sm bg-secondary text-accent">
              <Icon name={c.icon} fallback="Circle" size={19} />
            </span>
            <span className="min-w-0">
              <span className="block truncate font-head text-[1.2em] leading-none">{c.value}</span>
              <span className="mt-1 block truncate text-[0.72em] uppercase tracking-[0.08em] text-muted-foreground">
                {c.label}
              </span>
            </span>
          </div>
        ))}
      </div>

      {stats.top.length > 0 && (
        <Panel title="Самая затратная техника" className="flex-none">
          <div className="flex flex-col divide-y divide-border">
            {stats.top.map(([id, x]) => {
              const share = stats.sum > 0 ? Math.round((x.sum / stats.sum) * 100) : 0;
              return (
                <div key={id} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.86em]">{vTitle(id)}</span>
                    <span className="block text-[0.74em] text-muted-foreground">
                      записей {x.count}
                    </span>
                  </span>
                  <span className="h-1.5 w-28 flex-none overflow-hidden rounded-sm bg-secondary">
                    <span className="block h-full bg-accent" style={{ width: `${share}%` }} />
                  </span>
                  <span className="w-28 flex-none text-right font-head text-[0.86em]">
                    {money(x.sum)} ₽
                  </span>
                </div>
              );
            })}
          </div>
        </Panel>
      )}

      <Panel
        title="ТО и ремонты по месяцам"
        note={`${repairs.length} записей`}
        className="min-h-0 flex-1"
        action={
          canEdit ? (
            <Button
              size="sm"
              onClick={() => setForm(true)}
              className="ml-auto gap-1.5 rounded-sm bg-accent font-head uppercase tracking-[0.06em] text-accent-foreground hover:bg-accent/90"
            >
              <Icon name="Plus" size={14} />
              Запись
            </Button>
          ) : undefined
        }
      >
        {loading && !repairs.length ? (
          <Empty icon="Loader" title="Загружаем" hint="Секунду." />
        ) : !repairs.length ? (
          <Empty
            icon="Wrench"
            title="Записей пока нет"
            hint="Нажмите «Запись» — внесите ТО или ремонт с суммой и запчастями."
          />
        ) : (
          <div className="scrollbar-thin h-full overflow-y-auto">
            <div className="flex flex-col divide-y divide-border">
              {byMonth.map(([ym, list]) => {
                const sum = list.reduce((s, r) => s + (r.amount || 0), 0);
                const on = openYm === ym;
                return (
                  <div key={ym} className="flex flex-col">
                    <button
                      type="button"
                      onClick={() => setOpenYm(on ? null : ym)}
                      className="flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/50"
                    >
                      <span className="flex h-9 w-9 flex-none items-center justify-center rounded-sm bg-secondary text-accent">
                        <Icon name="CalendarDays" size={16} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-head text-[0.92em] uppercase tracking-[0.04em]">
                          {ymTitle(ym)}
                        </span>
                        <span className="block text-[0.76em] text-muted-foreground">
                          записей {list.length} · ТО{' '}
                          {list.filter((r) => r.kind === 'service').length} · ремонтов{' '}
                          {list.filter((r) => r.kind === 'repair').length}
                        </span>
                      </span>
                      <span className="flex-none font-head text-[0.88em]">{money(sum)} ₽</span>
                      <Icon
                        name={on ? 'ChevronUp' : 'ChevronDown'}
                        size={16}
                        className="flex-none text-muted-foreground"
                      />
                    </button>

                    {on && (
                      <div className="flex flex-col gap-1.5 px-3 pb-3">
                        {list.map((r) => (
                          <div
                            key={r.id}
                            className="flex flex-col gap-1.5 rounded-sm border border-border bg-card px-3 py-2"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={cn(
                                  'flex-none rounded-sm border px-2 py-0.5 text-[0.72em] uppercase tracking-[0.06em]',
                                  r.kind === 'service'
                                    ? 'border-accent text-accent'
                                    : 'border-destructive text-destructive',
                                )}
                              >
                                {REPAIR_LABEL[r.kind] ?? r.kind}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-[0.86em]">
                                  {r.title || 'Без названия'}
                                </span>
                                <span className="block truncate text-[0.74em] text-muted-foreground">
                                  {vTitle(r.vehicleId)} · {ruDate(r.repairDate)}
                                  {r.odometer ? ` · ${r.odometer} км` : ''}
                                  {r.author ? ` · ${r.author}` : ''}
                                </span>
                              </span>
                              <span className="flex-none font-head text-[0.86em]">
                                {money(r.amount)} ₽
                              </span>
                              {canEdit && (
                                <button
                                  type="button"
                                  onClick={() => drop(r.id)}
                                  className="flex h-6 w-6 flex-none items-center justify-center rounded-sm border border-border text-muted-foreground transition-colors hover:border-destructive hover:text-destructive"
                                >
                                  <Icon name="X" size={12} />
                                </button>
                              )}
                            </div>
                            {(r.parts || r.note) && (
                              <p className="text-[0.78em] text-muted-foreground">
                                {r.parts}
                                {r.parts && r.note ? ' · ' : ''}
                                {r.note}
                              </p>
                            )}
                            {r.photos?.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {r.photos.map((p) => (
                                  <a key={p} href={p} target="_blank" rel="noreferrer">
                                    <img
                                      src={p}
                                      alt="фото ремонта"
                                      className="h-14 w-14 rounded-sm border border-border object-cover"
                                    />
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Panel>

      <Dialog open={form} onOpenChange={setForm}>
        <DialogContent className="max-h-[88vh] max-w-lg overflow-y-auto rounded-sm">
          <DialogHeader>
            <DialogTitle className="font-head text-[1.2em] uppercase tracking-[0.03em]">
              ТО или ремонт
            </DialogTitle>
            <DialogDescription>
              Запись попадёт в статистику и в досье этой единицы техники.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5">
            <div className="flex gap-1.5">
              {(['repair', 'service'] as RepairKind[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  className={cn(
                    'flex-1 rounded-sm border px-3 py-2 text-[0.86em] font-head uppercase tracking-[0.05em] transition-colors',
                    kind === k
                      ? 'border-accent bg-accent text-accent-foreground'
                      : 'border-input hover:bg-secondary',
                  )}
                >
                  {REPAIR_LABEL[k]}
                </button>
              ))}
            </div>

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

            <div className="space-y-1.5">
              <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
                Что сделано
              </Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Замена масла и фильтров"
                className="rounded-sm"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
                  Дата
                </Label>
                <Input
                  type="date"
                  value={repairDate}
                  onChange={(e) => setRepairDate(e.target.value)}
                  className="rounded-sm"
                />
              </div>
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
            </div>

            <div className="space-y-1.5">
              <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
                Запчасти и материалы
              </Label>
              <Textarea
                value={parts}
                onChange={(e) => setParts(e.target.value)}
                rows={2}
                className="rounded-sm"
                placeholder="Масло 5W40 — 6 л, фильтр масляный — 1 шт"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
                Фото
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
                  {photos.length ? `Выбрано фото: ${photos.length}` : 'Добавить фото'}
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
    </div>
  );
};

export default RepairsCabinet;
