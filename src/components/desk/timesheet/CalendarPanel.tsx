import Panel from '@/components/desk/Panel';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  dayKey,
  MONTHS,
  WEEKDAYS,
  TimeEntry,
  dayHours,
  fmtHours,
  shiftOf,
  MARKS,
  MARK_BY_ID,
  isMark,
  kindOf,
  codeOf,
} from '@/data/timesheet';

const today = new Date();

interface CalendarPanelProps {
  sheet: Record<string, TimeEntry[]>;
  year: number;
  month: number;
  daysInMonth: number;
  firstShift: number;
  entries: [string, TimeEntry[]][];
  workEntries: [string, TimeEntry[]][];
  totalHours: number;
  moDays: number;
  loading: boolean;
  synced: boolean;
  shift: (delta: number) => void;
  openDay: (d: number) => void;
  onReport: () => void;
}

const CalendarPanel = ({
  sheet,
  year,
  month,
  daysInMonth,
  firstShift,
  entries,
  workEntries,
  totalHours,
  moDays,
  loading,
  synced,
  shift,
  openDay,
  onReport,
}: CalendarPanelProps) => (
  <Panel
    title="Табель учёта рабочего времени"
    note={`${workEntries.length} см. · ${fmtHours(totalHours)} ч${
      moDays ? ` · МО ${moDays}` : ''
    }${loading ? ' · загрузка' : synced ? ' · в облаке' : ''}`}
    action={
      <span className="ml-3 flex items-center gap-1">
        <button
          type="button"
          onClick={() => shift(-1)}
          className="flex h-7 w-7 items-center justify-center rounded-sm bg-secondary hover:bg-border"
        >
          <Icon name="ChevronLeft" size={15} />
        </button>
        <span className="min-w-[112px] text-center font-body text-[0.95em] normal-case tracking-normal">
          {MONTHS[month]} {year}
        </span>
        <button
          type="button"
          onClick={() => shift(1)}
          className="flex h-7 w-7 items-center justify-center rounded-sm bg-secondary hover:bg-border"
        >
          <Icon name="ChevronRight" size={15} />
        </button>
      </span>
    }
  >
    <div className="p-3">
      <div className="mb-1.5 grid grid-cols-7 gap-1">
        {WEEKDAYS.map((w) => (
          <span
            key={w}
            className="py-1 text-center text-[0.72em] uppercase tracking-[0.1em] text-muted-foreground"
          >
            {w}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstShift }).map((_, i) => (
          <span key={`e${i}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const d = i + 1;
          const list = sheet[dayKey(year, month, d)];
          const isToday =
            d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
          return (
            <button
              key={d}
              type="button"
              onClick={() => openDay(d)}
              className={cn(
                'flex min-h-[62px] flex-col rounded-sm border p-1.5 text-left transition-colors',
                isMark(list)
                  ? 'border-warning bg-warning/10 hover:bg-warning/20'
                  : list?.length
                    ? 'border-accent bg-accent/10 hover:bg-accent/20'
                    : 'border-border hover:bg-secondary/60',
                isToday && 'ring-1 ring-foreground',
              )}
            >
              <span className="flex items-center gap-1">
                <span className="font-head text-[0.95em] leading-none">{d}</span>
                {isMark(list) ? (
                  <Icon
                    name={MARK_BY_ID[kindOf(list) as string]?.icon ?? 'Home'}
                    size={11}
                    className="text-warning"
                  />
                ) : (
                  !!list?.length && (
                    <Icon
                      name={shiftOf(list) === 'night' ? 'Moon' : 'Sun'}
                      size={11}
                      className="text-accent"
                    />
                  )
                )}
                {(list?.length ?? 0) > 1 && (
                  <span className="ml-auto rounded-[2px] bg-accent px-1 text-[0.6em] leading-[1.4] text-accent-foreground">
                    {list!.length}
                  </span>
                )}
              </span>
              {isMark(list) ? (
                <span className="mt-auto font-head text-[0.78em] uppercase text-warning">
                  {codeOf(list)}
                </span>
              ) : list?.length ? (
                <>
                  <span className="mt-1 line-clamp-2 text-[0.66em] leading-tight text-muted-foreground">
                    {list.map((e) => e.objectTitle).join(' · ')}
                  </span>
                  <span className="mt-auto font-head text-[0.72em] text-accent">
                    {fmtHours(dayHours(list))} ч
                  </span>
                </>
              ) : (
                <Icon name="Plus" size={12} className="mt-auto self-end text-muted-foreground/40" />
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-3 grid grid-cols-4 gap-px overflow-hidden rounded-sm bg-border sm:grid-cols-7">
        {[
          { code: 'Я', label: 'Явок', value: workEntries.length, hot: true },
          ...MARKS.map((m) => ({
            code: m.code,
            label: m.label,
            value: entries.filter(([, l]) => codeOf(l) === m.code).length,
            hot: false,
          })),
        ].map((c) => (
          <span key={c.code} className="bg-card px-2 py-2 text-center" title={c.label}>
            <span
              className={cn(
                'block font-head text-[1.1em] leading-none',
                c.value ? (c.hot ? 'text-accent' : 'text-warning') : 'text-muted-foreground/40',
              )}
            >
              {c.value}
            </span>
            <span className="mt-1 block text-[0.66em] uppercase tracking-[0.08em] text-muted-foreground">
              {c.code}
            </span>
          </span>
        ))}
      </div>

      <Button
        onClick={onReport}
        className="mt-3 w-full gap-2 rounded-sm bg-accent font-head uppercase tracking-[0.06em] text-accent-foreground hover:bg-accent/90"
      >
        <Icon name="FileText" size={16} />
        Сформировать табель
      </Button>
    </div>
  </Panel>
);

export default CalendarPanel;
