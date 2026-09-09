import { useMemo, useState } from 'react';
import Panel from '@/components/desk/Panel';
import Empty from '@/components/desk/Empty';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Vehicle } from '@/data/vehicles';
import { Waybill, removeWb, useWaybills } from '@/data/waybills';
import { downloadWaybillSheet, downloadWaybillsSummary } from '@/lib/waybillSheet';
import { ruDate, ymTitle } from '@/data/fleet';
import WaybillSheetForm from '@/components/desk/waybill/WaybillSheetForm';

interface WaybillsCabinetProps {
  vehicles: Vehicle[];
  defaultVehicle?: string;
  canEdit?: boolean;
}

const WaybillsCabinet = ({
  vehicles,
  defaultVehicle,
  canEdit = true,
}: WaybillsCabinetProps) => {
  const { toast } = useToast();
  const { waybills, loading, reload } = useWaybills();
  const [form, setForm] = useState(false);
  const [openYm, setOpenYm] = useState<string | null>(null);

  const byMonth = useMemo(() => {
    const map = new Map<string, Waybill[]>();
    waybills.forEach((w) => {
      const k = w.ym || 'Без даты';
      map.set(k, [...(map.get(k) ?? []), w]);
    });
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [waybills]);

  const runOf = (w: Waybill) => Math.max(0, (w.odoIn || 0) - (w.odoOut || 0));

  const stats = useMemo(() => {
    const run = waybills.reduce((s, w) => s + runOf(w), 0);
    const norm = waybills.reduce((s, w) => s + (w.fuelNorm || 0), 0);
    const fact = waybills.reduce((s, w) => s + (w.fuelFact || 0), 0);
    return { total: waybills.length, run, norm, fact, diff: fact - norm };
  }, [waybills]);

  const drop = async (id: string) => {
    await removeWb('waybill', id);
    toast({ title: 'Путевой лист удалён' });
    reload();
  };

  const counters = [
    { l: 'Путевых листов', v: String(stats.total), i: 'FileText' },
    { l: 'Пробег всего, км', v: String(stats.run), i: 'Navigation' },
    { l: 'Норма топлива, л', v: stats.norm.toFixed(1), i: 'Fuel' },
    {
      l: stats.diff >= 0 ? 'Перерасход, л' : 'Экономия, л',
      v: Math.abs(stats.diff).toFixed(1),
      i: stats.diff > 0 ? 'TrendingUp' : 'TrendingDown',
    },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="grid flex-none gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {counters.map((c) => (
          <div
            key={c.l}
            className="flex items-center gap-3 rounded-sm border border-border bg-card px-4 py-3.5"
          >
            <span className="flex h-10 w-10 flex-none items-center justify-center rounded-sm bg-secondary text-accent">
              <Icon name={c.i} fallback="Circle" size={19} />
            </span>
            <span className="min-w-0">
              <span className="block truncate font-head text-[1.2em] leading-none">{c.v}</span>
              <span className="mt-1 block truncate text-[0.72em] uppercase tracking-[0.08em] text-muted-foreground">
                {c.l}
              </span>
            </span>
          </div>
        ))}
      </div>

      <Panel
        title="Путевые листы по месяцам"
        note={`${waybills.length}`}
        className="min-h-0 flex-1"
        action={
          <div className="ml-auto flex gap-1.5">
            <Button
              size="sm"
              variant="outline"
              onClick={() => downloadWaybillsSummary(waybills, 'весь период')}
              className="gap-1.5 rounded-sm"
            >
              <Icon name="Download" size={14} />
              Свод
            </Button>
            {canEdit && (
              <Button
                size="sm"
                onClick={() => setForm(true)}
                className="gap-1.5 rounded-sm bg-accent font-head uppercase tracking-[0.06em] text-accent-foreground hover:bg-accent/90"
              >
                <Icon name="Plus" size={14} />
                Создать
              </Button>
            )}
          </div>
        }
      >
        {loading && !waybills.length ? (
          <Empty icon="Loader" title="Загружаем" hint="Секунду." />
        ) : !waybills.length ? (
          <Empty
            icon="FileText"
            title="Путевых листов пока нет"
            hint="Нажмите «Создать» — форма повторяет типовой бланк спецавтомобиля."
          />
        ) : (
          <div className="scrollbar-thin h-full overflow-y-auto">
            <div className="flex flex-col divide-y divide-border">
              {byMonth.map(([ym, list]) => {
                const on = openYm === ym;
                const run = list.reduce((s, w) => s + runOf(w), 0);
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
                          листов {list.length} · пробег {run} км
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadWaybillsSummary(list, ymTitle(ym));
                        }}
                        className="flex h-7 w-7 flex-none items-center justify-center rounded-sm border border-border text-muted-foreground transition-colors hover:border-accent hover:text-accent"
                      >
                        <Icon name="Download" size={13} />
                      </button>
                      <Icon
                        name={on ? 'ChevronUp' : 'ChevronDown'}
                        size={16}
                        className="flex-none text-muted-foreground"
                      />
                    </button>

                    {on && (
                      <div className="flex flex-col gap-1.5 px-3 pb-3">
                        {list.map((w) => (
                          <div
                            key={w.id}
                            className="flex flex-wrap items-center gap-2 rounded-sm border border-border bg-card px-3 py-2.5"
                          >
                            <span className="flex h-9 w-9 flex-none items-center justify-center rounded-sm bg-secondary text-accent">
                              <Icon name="FileText" size={16} />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-head text-[0.88em] uppercase tracking-[0.03em]">
                                № {w.number || '—'} от {ruDate(w.wbDate)}
                              </span>
                              <span className="block truncate text-[0.76em] text-muted-foreground">
                                {w.carModel} {w.carPlate} · {w.driverFio || '—'}
                                {w.customer ? ` · ${w.customer}` : ''}
                              </span>
                            </span>
                            <span
                              className={cn(
                                'flex-none rounded-sm border px-2 py-0.5 text-[0.72em]',
                                'border-border text-muted-foreground',
                              )}
                            >
                              {runOf(w)} км
                            </span>
                            <button
                              type="button"
                              onClick={() => downloadWaybillSheet(w)}
                              className="flex h-7 w-7 flex-none items-center justify-center rounded-sm border border-border text-muted-foreground transition-colors hover:border-accent hover:text-accent"
                            >
                              <Icon name="Download" size={13} />
                            </button>
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => drop(w.id)}
                                className="flex h-7 w-7 flex-none items-center justify-center rounded-sm border border-border text-muted-foreground transition-colors hover:border-destructive hover:text-destructive"
                              >
                                <Icon name="X" size={13} />
                              </button>
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

      <WaybillSheetForm
        open={form}
        onOpenChange={setForm}
        vehicles={vehicles}
        defaultVehicle={defaultVehicle}
      />
    </div>
  );
};

export default WaybillsCabinet;
