import { useMemo, useState } from 'react';
import Panel from '@/components/desk/Panel';
import Empty from '@/components/desk/Empty';
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
import { useChiefScope } from '@/data/chief';
import { useVehicles, Vehicle, KIND_LABEL } from '@/data/vehicles';
import { MONTHS, fmtHours } from '@/data/timesheet';
import {
  ASSET_DAY_STATUSES,
  AssetDayStatus,
  AssetSheetKind,
  dayKey,
  monthKeyOf,
  statusInfo,
  useAssetSheet,
} from '@/data/assetsheet';
import { downloadAssetSheet } from '@/lib/assetSheetXls';

interface AssetTimesheetProps {
  kind: AssetSheetKind;
  onBack?: () => void;
}

const TITLE: Record<AssetSheetKind, { title: string; note: string; icon: string }> = {
  vehicle: {
    title: 'Табель транспорта',
    note: 'Часы работы, простои, ТО и ремонт по каждой машине',
    icon: 'Truck',
  },
  cabin: {
    title: 'Табель вагонов и бытовок',
    note: 'Дни эксплуатации по каждому вагон-дому',
    icon: 'Container',
  },
};

const AssetTimesheet = ({ kind, onBack }: AssetTimesheetProps) => {
  const { toast } = useToast();
  const { profile } = useProfile();
  const { objects, objectIds, wide } = useChiefScope();
  const { items: assets, loading: assetsLoading } = useVehicles();

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const monthKey = monthKeyOf(year, month);

  const { byAsset, loading, save } = useAssetSheet(kind, monthKey);

  const [cell, setCell] = useState<{ assetId: string; day: string } | null>(null);
  const [form, setForm] = useState<{ status: AssetDayStatus; hours: string; note: string }>({
    status: 'work',
    hours: '11',
    note: '',
  });
  const [busy, setBusy] = useState(false);

  const info = TITLE[kind];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const list = useMemo(
    () =>
      (assets ?? []).filter(
        (v: Vehicle) => v.assetType === kind && (wide || objectIds.includes(v.objectId)),
      ),
    [assets, kind, wide, objectIds],
  );

  const objTitle = (id: string) => objects.find((o) => o.id === id)?.title ?? '—';

  const rows = useMemo(
    () =>
      list.map((v: Vehicle) => {
        const sheet = byAsset.get(v.id) ?? {};
        let hours = 0;
        let work = 0;
        let idle = 0;
        days.forEach((d) => {
          const rec = sheet[dayKey(year, month, d)];
          if (!rec) return;
          hours += rec.hours;
          if (rec.status === 'work') work += 1;
          else if (rec.status !== 'off') idle += 1;
        });
        return { asset: v, sheet, hours, work, idle };
      }),
    [list, byAsset, days, year, month],
  );

  const openCell = (assetId: string, day: string) => {
    const rec = byAsset.get(assetId)?.[day];
    setForm({
      status: (rec?.status as AssetDayStatus) ?? 'work',
      hours: String(rec?.hours ?? (kind === 'vehicle' ? 11 : 24)),
      note: rec?.note ?? '',
    });
    setCell({ assetId, day });
  };

  const saveCell = async () => {
    if (!cell) return;
    const asset = list.find((v: Vehicle) => v.id === cell.assetId);
    setBusy(true);
    try {
      await save([
        {
          assetId: cell.assetId,
          assetKind: kind,
          day: cell.day,
          status: form.status,
          hours: Number(form.hours.replace(',', '.')) || 0,
          objectId: asset?.objectId ?? '',
          note: form.note,
          authorFio: profile.fio,
        },
      ]);
      setCell(null);
    } catch {
      toast({ title: 'Не удалось сохранить', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const fillMonth = async (assetId: string) => {
    const asset = list.find((v: Vehicle) => v.id === assetId);
    const rows_ = days.map((d) => ({
      assetId,
      assetKind: kind,
      day: dayKey(year, month, d),
      status: 'work' as AssetDayStatus,
      hours: kind === 'vehicle' ? 11 : 24,
      objectId: asset?.objectId ?? '',
      note: '',
      authorFio: profile.fio,
    }));
    await save(rows_);
    toast({ title: 'Месяц заполнен', description: asset?.model ?? '' });
  };

  const totalHours = rows.reduce((a, r) => a + r.hours, 0);

  return (
    <div className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="flex w-fit flex-none items-center gap-1.5 rounded-sm border border-border bg-card px-2.5 py-1 text-[0.78em] uppercase tracking-[0.08em] transition-colors hover:border-accent hover:bg-secondary"
        >
          <Icon name="ArrowLeft" size={14} className="text-accent" />
          К обзору
        </button>
      )}

      <section className="flex-none rounded-sm border border-border border-t-2 border-t-accent bg-card px-4 py-4">
        <h1 className="font-head text-[1.05em] uppercase leading-tight tracking-[0.03em]">
          {info.title}
        </h1>
        <p className="mt-1 text-[0.85em] text-muted-foreground">{info.note}</p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => (month === 0 ? (setMonth(11), setYear(year - 1)) : setMonth(month - 1))}
            className="flex h-8 w-8 items-center justify-center rounded-sm border border-border transition-colors hover:bg-secondary"
          >
            <Icon name="ChevronLeft" size={15} />
          </button>
          <span className="font-head text-[0.92em] uppercase tracking-[0.05em]">
            {MONTHS[month]} {year}
          </span>
          <button
            type="button"
            onClick={() => (month === 11 ? (setMonth(0), setYear(year + 1)) : setMonth(month + 1))}
            className="flex h-8 w-8 items-center justify-center rounded-sm border border-border transition-colors hover:bg-secondary"
          >
            <Icon name="ChevronRight" size={15} />
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2 text-[0.76em]">
          {ASSET_DAY_STATUSES.map((s) => (
            <span key={s.id} className="flex items-center gap-1.5">
              <span
                className={cn(
                  'flex h-5 w-6 items-center justify-center rounded-sm border text-[0.9em]',
                  s.id === 'work'
                    ? 'border-accent/40 bg-accent/15'
                    : s.id === 'repair'
                      ? 'border-destructive/40 bg-destructive/10'
                      : s.id === 'off'
                        ? 'border-border text-muted-foreground'
                        : 'border-border bg-secondary',
                )}
              >
                {s.short}
              </span>
              {s.label}
            </span>
          ))}
        </div>
      </section>

      <div className="grid flex-none gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { icon: info.icon, label: kind === 'vehicle' ? 'Единиц техники' : 'Вагонов', value: rows.length },
          { icon: 'CalendarCheck', label: 'Рабочих смен', value: rows.reduce((a, r) => a + r.work, 0) },
          { icon: 'Wrench', label: 'Простой, ТО, ремонт', value: rows.reduce((a, r) => a + r.idle, 0) },
          { icon: 'Clock', label: 'Часов всего', value: fmtHours(totalHours) },
        ].map((c) => (
          <div
            key={c.label}
            className="flex items-center gap-3 rounded-sm border border-border bg-card px-4 py-3.5"
          >
            <span className="flex h-10 w-10 flex-none items-center justify-center rounded-sm bg-secondary text-accent">
              <Icon name={c.icon} fallback="Circle" size={19} />
            </span>
            <span className="min-w-0">
              <span className="block font-head text-[22px] leading-none">{c.value}</span>
              <span className="mt-1 block truncate text-[0.74em] uppercase tracking-[0.08em] text-muted-foreground">
                {c.label}
              </span>
            </span>
          </div>
        ))}
      </div>

      <Button
        onClick={() =>
          downloadAssetSheet(rows, {
            year,
            month,
            daysInMonth,
            kind,
            title: info.title,
            chief: profile.fio,
            project: profile.group,
            objTitle,
          })
        }
        className="h-12 flex-none gap-2 rounded-sm bg-accent font-head text-[0.9em] uppercase tracking-[0.06em] text-accent-foreground hover:bg-accent/90"
      >
        <Icon name="FileSpreadsheet" size={18} />
        Выгрузить табель в Excel
      </Button>

      <Panel title={info.title} note={`${MONTHS[month]} ${year}`}>
        {assetsLoading || loading ? (
          <p className="flex items-center gap-2 p-4 text-[0.85em] text-muted-foreground">
            <Icon name="Loader2" size={15} className="animate-spin" />
            Загружаем табель…
          </p>
        ) : rows.length === 0 ? (
          <Empty
            icon={info.icon}
            title={kind === 'vehicle' ? 'Техники нет' : 'Вагонов нет'}
            hint="Появятся после закрепления за вашими объектами."
          />
        ) : (
          rows.map((r) => (
            <div key={r.asset.id} className="border-b border-border px-4 py-3 last:border-b-0">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-sm bg-secondary text-accent">
                  <Icon name={info.icon} fallback="Box" size={16} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.92em]">
                    {r.asset.model || r.asset.invNo || 'Без названия'}
                    {r.asset.plate ? ` · ${r.asset.plate}` : ''}
                  </span>
                  <span className="block truncate text-[0.76em] text-muted-foreground">
                    {kind === 'vehicle' ? KIND_LABEL[r.asset.kind] : 'Вагон-дом'} ·{' '}
                    {objTitle(r.asset.objectId)}
                    {r.asset.driver ? ` · ${r.asset.driver}` : ''} · смен {r.work} · часов{' '}
                    {fmtHours(r.hours)}
                  </span>
                </span>
                <button
                  type="button"
                  title="Заполнить весь месяц работой"
                  onClick={() => fillMonth(r.asset.id)}
                  className="flex h-8 items-center gap-1.5 rounded-sm bg-secondary px-2.5 text-[0.76em] transition-colors hover:bg-border"
                >
                  <Icon name="CalendarPlus" size={14} />
                  Месяц
                </button>
              </div>

              <div className="mt-2 grid grid-cols-[repeat(auto-fill,minmax(40px,1fr))] gap-1 pl-12">
                {days.map((d) => {
                  const key = dayKey(year, month, d);
                  const rec = r.sheet[key];
                  const si = statusInfo(rec?.status ?? 'off');
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => openCell(r.asset.id, key)}
                      className={cn(
                        'flex flex-col items-center rounded-sm border px-1 py-1 text-[0.68em] transition-colors',
                        !rec
                          ? 'border-border text-muted-foreground hover:border-accent'
                          : rec.status === 'work'
                            ? 'border-accent/40 bg-accent/10'
                            : rec.status === 'repair'
                              ? 'border-destructive/40 bg-destructive/10'
                              : 'border-border bg-secondary',
                      )}
                    >
                      <span>{d}</span>
                      <span className="font-head">
                        {rec ? (rec.status === 'work' ? fmtHours(rec.hours) : si.short) : '—'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </Panel>

      <Dialog open={!!cell} onOpenChange={(v) => !v && setCell(null)}>
        <DialogContent className="max-w-sm rounded-sm border-t-2 border-t-accent">
          <DialogHeader>
            <DialogTitle className="font-head text-[1.1em] uppercase tracking-[0.03em]">
              День {cell ? new Date(cell.day).toLocaleDateString('ru') : ''}
            </DialogTitle>
            <DialogDescription className="text-[0.85em]">
              {list.find((v: Vehicle) => v.id === cell?.assetId)?.model ?? ''}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-[0.7em] uppercase tracking-[0.1em] text-muted-foreground">
                Состояние
              </Label>
              <div className="grid grid-cols-2 gap-1.5">
                {ASSET_DAY_STATUSES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, status: s.id }))}
                    className={cn(
                      'rounded-sm border px-2 py-2 text-[0.78em] transition-colors',
                      form.status === s.id
                        ? 'border-accent bg-accent text-accent-foreground'
                        : 'border-input hover:bg-secondary',
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-[0.7em] uppercase tracking-[0.1em] text-muted-foreground">
                Часов за день
              </Label>
              <Input
                value={form.hours}
                onChange={(e) => setForm((p) => ({ ...p, hours: e.target.value }))}
                className="h-9 rounded-sm text-[0.88em]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-[0.7em] uppercase tracking-[0.1em] text-muted-foreground">
                Примечание
              </Label>
              <Input
                value={form.note}
                onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
                placeholder="замена масла, стоянка"
                className="h-9 rounded-sm text-[0.88em]"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 rounded-sm" onClick={() => setCell(null)}>
              Отмена
            </Button>
            <Button
              disabled={busy}
              onClick={saveCell}
              className="flex-1 gap-2 rounded-sm bg-accent font-head uppercase tracking-[0.06em] text-accent-foreground hover:bg-accent/90"
            >
              <Icon
                name={busy ? 'Loader2' : 'Check'}
                size={16}
                className={busy ? 'animate-spin' : ''}
              />
              Сохранить
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export type AssetRow = {
  asset: Vehicle;
  sheet: Record<string, { status: string; hours: number; note: string }>;
  hours: number;
  work: number;
  idle: number;
};

export default AssetTimesheet;
