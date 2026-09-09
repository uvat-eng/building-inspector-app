import { useMemo, useState } from 'react';
import Panel from '@/components/desk/Panel';
import Empty from '@/components/desk/Empty';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useProfile } from '@/data/profile';
import { Vehicle } from '@/data/vehicles';
import { DAY_LABEL, DayState, createFleet, useFleet } from '@/data/fleet';

interface CarSheetProps {
  vehicle: Vehicle | null;
}

const WD = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'];

const CarSheet = ({ vehicle }: CarSheetProps) => {
  const { toast } = useToast();
  const { profile } = useProfile();
  const { days, reload } = useFleet();
  const [ym, setYm] = useState(() => new Date().toISOString().slice(0, 7));
  const [busy, setBusy] = useState('');

  const grid = useMemo(() => {
    const [y, m] = ym.split('-').map(Number);
    const total = new Date(y, m, 0).getDate();
    return Array.from({ length: total }, (_, i) => {
      const d = new Date(y, m - 1, i + 1);
      return {
        day: `${ym}-${String(i + 1).padStart(2, '0')}`,
        n: i + 1,
        wd: WD[(d.getDay() + 6) % 7],
        weekend: d.getDay() === 0 || d.getDay() === 6,
      };
    });
  }, [ym]);

  const mine = useMemo(
    () =>
      days.filter(
        (d) => d.vehicleId === vehicle?.id && d.driverFio === profile.fio && d.ym === ym,
      ),
    [days, vehicle?.id, profile.fio, ym],
  );

  const cellOf = (day: string) => mine.find((d) => d.day === day);

  const stats = useMemo(() => {
    const line = mine.filter((d) => d.state === 'line');
    const rep = mine.filter((d) => d.state === 'repair');
    const shifts = mine.reduce((s, d) => s + (d.share || 0), 0);
    return { line: line.length, rep: rep.length, shifts: Math.round(shifts * 100) / 100 };
  }, [mine]);

  const toggle = async (day: string) => {
    if (!vehicle) {
      toast({ title: 'Сначала должна быть закреплена машина', variant: 'destructive' });
      return;
    }
    const cur = cellOf(day);
    const next: DayState | null =
      !cur ? 'line' : cur.state === 'line' ? 'repair' : null;
    setBusy(day);
    try {
      if (next === null) {
        await createFleet('day', {
          vehicleId: vehicle.id,
          driverFio: profile.fio,
          day,
          state: 'line',
          share: 0,
          author: profile.fio,
        });
      } else {
        await createFleet('day', {
          vehicleId: vehicle.id,
          driverFio: profile.fio,
          day,
          state: next,
          share: next === 'repair' ? 0.67 : 1,
          author: profile.fio,
        });
      }
      reload();
    } catch {
      toast({ title: 'Не удалось отметить', variant: 'destructive' });
    } finally {
      setBusy('');
    }
  };

  return (
    <Panel
      title="Табель автомобиля и водителя"
      note={`${stats.shifts} смен`}
      className="flex-none"
      action={
        <input
          type="month"
          value={ym}
          onChange={(e) => setYm(e.target.value)}
          className="ml-auto rounded-sm border border-border bg-card px-2 py-1 text-[0.8em]"
        />
      }
    >
      {!vehicle ? (
        <Empty
          icon="Truck"
          title="Машина не закреплена"
          hint="Табель откроется, когда механик закрепит за вами технику."
        />
      ) : (
        <div className="flex flex-col gap-3 p-3">
          <div className="grid grid-cols-3 gap-2">
            {[
              { l: 'На линии, дней', v: stats.line, i: 'Navigation' },
              { l: 'На ремонте, дней', v: stats.rep, i: 'Wrench' },
              { l: 'Смен зачтено', v: stats.shifts, i: 'CalendarCheck' },
            ].map((c) => (
              <div
                key={c.l}
                className="flex items-center gap-2 rounded-sm border border-border bg-card px-2.5 py-2"
              >
                <Icon name={c.i} fallback="Circle" size={15} className="flex-none text-accent" />
                <span className="min-w-0">
                  <span className="block font-head text-[1em] leading-none">{c.v}</span>
                  <span className="mt-0.5 block truncate text-[0.66em] uppercase tracking-[0.06em] text-muted-foreground">
                    {c.l}
                  </span>
                </span>
              </div>
            ))}
          </div>

          <p className="text-[0.78em] text-muted-foreground">
            Нажимайте на день: пусто → на линии → на ремонте → снова пусто. В день ремонта
            засчитывается 2/3 смены.
          </p>

          <div className="grid grid-cols-7 gap-1">
            {grid.map((g) => {
              const c = cellOf(g.day);
              const state = c && c.share > 0 ? c.state : null;
              return (
                <button
                  key={g.day}
                  type="button"
                  disabled={busy === g.day}
                  onClick={() => toggle(g.day)}
                  className={cn(
                    'flex flex-col items-center gap-0.5 rounded-sm border px-1 py-1.5 transition-colors',
                    state === 'line'
                      ? 'border-emerald-600 bg-emerald-600/10 text-emerald-700'
                      : state === 'repair'
                        ? 'border-destructive bg-destructive/10 text-destructive'
                        : g.weekend
                          ? 'border-border bg-secondary/40 text-muted-foreground'
                          : 'border-border bg-card hover:border-accent',
                  )}
                >
                  <span className="text-[0.62em] uppercase opacity-70">{g.wd}</span>
                  <span className="font-head text-[0.9em] leading-none">{g.n}</span>
                  <span className="text-[0.6em] leading-none">
                    {state === 'line' ? '1' : state === 'repair' ? '⅔' : '—'}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-2 text-[0.74em] text-muted-foreground">
            {(['line', 'repair'] as DayState[]).map((s) => (
              <span key={s} className="flex items-center gap-1.5">
                <span
                  className={cn(
                    'h-3 w-3 rounded-sm border',
                    s === 'line'
                      ? 'border-emerald-600 bg-emerald-600/20'
                      : 'border-destructive bg-destructive/20',
                  )}
                />
                {DAY_LABEL[s]} · {s === 'line' ? 'смена целиком' : '2/3 смены'}
              </span>
            ))}
          </div>
        </div>
      )}
    </Panel>
  );
};

export default CarSheet;
