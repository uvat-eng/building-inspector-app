import Icon from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import { LoadDay, shortDay, weekDay } from '@/data/objectload';

interface LoadHistoryProps {
  days: string[];
  sheet: Record<string, LoadDay>;
  onPick?: (day: string) => void;
  compact?: boolean;
}

const tone = (plan: number, fact: number) =>
  plan === 0
    ? 'border-border text-muted-foreground'
    : fact >= plan
      ? 'border-accent/40 bg-accent/15'
      : fact >= plan * 0.7
        ? 'border-amber-500/40 bg-amber-500/10'
        : 'border-destructive/40 bg-destructive/10';

const LoadHistory = ({ days, sheet, onPick, compact }: LoadHistoryProps) => {
  const max = Math.max(
    1,
    ...days.map((d) => Math.max(sheet[d]?.staffPlan ?? 0, sheet[d]?.staffFact ?? 0)),
  );

  return (
    <div className={cn('flex gap-1', compact ? '' : 'flex-wrap')}>
      {days.map((d) => {
        const rec = sheet[d];
        const plan = rec?.staffPlan ?? 0;
        const fact = rec?.staffFact ?? 0;
        const h = Math.round((fact / max) * 22);
        return (
          <button
            key={d}
            type="button"
            onClick={() => onPick?.(d)}
            title={
              rec
                ? `${shortDay(d)} · люди ${fact}/${plan} · техника ${rec.techFact}/${rec.techPlan}`
                : `${shortDay(d)} · данных нет`
            }
            className={cn(
              'flex flex-1 flex-col items-center gap-0.5 rounded-sm border px-1 py-1',
              'text-[0.62em] transition-colors',
              tone(plan, fact),
              onPick && 'hover:border-accent',
            )}
          >
            <span className="uppercase tracking-[0.05em] opacity-70">{weekDay(d)}</span>
            <span className="flex h-6 w-full items-end justify-center">
              <span
                className={cn(
                  'w-2 rounded-sm',
                  fact === 0 ? 'bg-border' : fact >= plan ? 'bg-accent' : 'bg-amber-500',
                )}
                style={{ height: `${Math.max(2, h)}px` }}
              />
            </span>
            <span className="font-head text-[1.05em]">{rec ? fact : '—'}</span>
          </button>
        );
      })}
      {days.length === 0 && (
        <p className="flex items-center gap-1.5 text-[0.8em] text-muted-foreground">
          <Icon name="ChartNoAxesColumn" size={14} />
          Истории пока нет
        </p>
      )}
    </div>
  );
};

export default LoadHistory;
