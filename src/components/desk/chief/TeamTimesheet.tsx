import { useEffect, useMemo, useState } from 'react';
import Panel from '@/components/desk/Panel';
import Empty from '@/components/desk/Empty';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useChiefScope } from '@/data/chief';
import { useProfile } from '@/data/profile';
import { User } from '@/data/users';
import {
  MONTHS,
  Timesheet,
  dayHours,
  fetchSheet,
  fmtHours,
  monthEntries,
} from '@/data/timesheet';
import { downloadTeamSheet } from '@/lib/teamSheetXls';

interface TeamTimesheetProps {
  mode: 'staff' | 'tech';
  onBack?: () => void;
}

export interface PersonMonth {
  user: User;
  days: Record<number, number>;
  workDays: number;
  hours: number;
  objects: string[];
}

const TeamTimesheet = ({ mode, onBack }: TeamTimesheetProps) => {
  const { profile } = useProfile();
  const { team, drivers, objects } = useChiefScope();
  const staff: User[] = mode === 'tech' ? drivers : team.filter((u: User) => u.role !== 'driver');

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [sheets, setSheets] = useState<Record<string, Timesheet>>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all(
      staff.map(async (u: User) => {
        try {
          return [u.id, await fetchSheet(u.id)] as const;
        } catch {
          return [u.id, {} as Timesheet] as const;
        }
      }),
    )
      .then((pairs) => {
        if (alive) setSheets(Object.fromEntries(pairs));
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [staff.map((u: User) => u.id).join(',')]);

  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const rows = useMemo<PersonMonth[]>(
    () =>
      staff.map((u: User) => {
        const entries = monthEntries(sheets[u.id] ?? {}, year, month);
        const days: Record<number, number> = {};
        const objSet = new Set<string>();
        let hours = 0;
        entries.forEach(([key, list]) => {
          const d = Number(key.slice(-2));
          const h = dayHours(list);
          days[d] = h;
          hours += h;
          list.forEach((e) => e.objectTitle && objSet.add(e.objectTitle));
        });
        return {
          user: u,
          days,
          workDays: Object.values(days).filter((h) => h > 0).length,
          hours,
          objects: [...objSet],
        };
      }),
    [staff, sheets, year, month],
  );

  const totalHours = rows.reduce((a, r) => a + r.hours, 0);
  const totalDays = rows.reduce((a, r) => a + r.workDays, 0);

  const title = mode === 'tech' ? 'Табель техники и водителей' : 'Табель персонала';

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
          {title}
        </h1>
        <p className="mt-1 text-[0.85em] text-muted-foreground">
          Пообъектно по каждому сотруднику · табель проекта для бухгалтерии и кадров
        </p>

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
      </section>

      <div className="grid flex-none gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { icon: 'Users', label: mode === 'tech' ? 'Водителей' : 'Сотрудников', value: rows.length },
          { icon: 'CalendarDays', label: 'Смен всего', value: totalDays },
          { icon: 'Clock', label: 'Часов всего', value: fmtHours(totalHours) },
          { icon: 'Building2', label: 'Объектов', value: objects.length },
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
          downloadTeamSheet(rows, {
            year,
            month,
            daysInMonth,
            title,
            chief: profile.fio,
            project: profile.group,
          })
        }
        className="h-12 flex-none gap-2 rounded-sm bg-accent font-head text-[0.9em] uppercase tracking-[0.06em] text-accent-foreground hover:bg-accent/90"
      >
        <Icon name="FileSpreadsheet" size={18} />
        Табель проекта для бухгалтерии
      </Button>

      <Panel title="Табель по сотрудникам" note={`${MONTHS[month]} ${year}`}>
        {loading ? (
          <p className="flex items-center gap-2 p-4 text-[0.85em] text-muted-foreground">
            <Icon name="Loader2" size={15} className="animate-spin" />
            Собираем табели…
          </p>
        ) : rows.length === 0 ? (
          <Empty
            icon="Users"
            title="Сотрудников нет"
            hint="Закрепите людей за собой или за объектами в разделе «Персонал»."
          />
        ) : (
          rows.map((r) => (
            <div key={r.user.id} className="border-b border-border last:border-b-0">
              <button
                type="button"
                onClick={() => setOpen((p) => (p === r.user.id ? null : r.user.id))}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/60"
              >
                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-sm bg-secondary text-accent">
                  <Icon name={mode === 'tech' ? 'Truck' : 'User'} size={16} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.92em]">{r.user.fio}</span>
                  <span className="block truncate text-[0.76em] text-muted-foreground">
                    смен {r.workDays} · часов {fmtHours(r.hours)}
                    {r.objects.length ? ` · ${r.objects.join(', ')}` : ''}
                  </span>
                </span>
                <Icon
                  name={open === r.user.id ? 'ChevronDown' : 'ChevronRight'}
                  size={16}
                  className="flex-none text-muted-foreground"
                />
              </button>

              {open === r.user.id && (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(38px,1fr))] gap-1 px-4 pb-3 pl-8">
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
                    <span
                      key={d}
                      className={cn(
                        'flex flex-col items-center rounded-sm border px-1 py-1 text-[0.68em]',
                        r.days[d]
                          ? 'border-accent/40 bg-accent/10'
                          : 'border-border text-muted-foreground',
                      )}
                    >
                      <span>{d}</span>
                      <span className="font-head">{r.days[d] ? fmtHours(r.days[d]) : '—'}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </Panel>
    </div>
  );
};

export default TeamTimesheet;
