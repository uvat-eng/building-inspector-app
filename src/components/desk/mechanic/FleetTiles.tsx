import Icon from '@/components/ui/icon';
import Empty from '@/components/desk/Empty';
import { cn } from '@/lib/utils';
import { Vehicle, KIND_LABEL, daysLeft } from '@/data/vehicles';
import { FleetShift, activeShift, ruDate } from '@/data/fleet';

interface FleetTilesProps {
  items: Vehicle[];
  shifts: FleetShift[];
  onOpen: (id: string) => void;
}

const TONE: Record<string, string> = {
  'На линии': 'border-l-emerald-600',
  ТО: 'border-l-amber-500',
  Ремонт: 'border-l-destructive',
  Стоянка: 'border-l-border',
};

const BADGE: Record<string, string> = {
  'На линии': 'border-emerald-600 text-emerald-600',
  ТО: 'border-amber-500 text-amber-600',
  Ремонт: 'border-destructive text-destructive',
  Стоянка: 'border-border text-muted-foreground',
};

const FleetTiles = ({ items, shifts, onOpen }: FleetTilesProps) => {
  if (!items.length) {
    return (
      <Empty
        icon="Truck"
        title="Техники пока нет"
        hint="Нажмите «Техника» — добавьте машину и закрепите водителя."
      />
    );
  }

  return (
    <div className="grid gap-2 p-3 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((v) => {
        const shift = activeShift(shifts, v.id);
        const driver = shift?.driverFio || v.driver || 'Водитель не закреплён';
        const svc = daysLeft(v.serviceAt);
        return (
          <button
            key={v.id}
            type="button"
            onClick={() => onOpen(v.id)}
            className={cn(
              'flex flex-col gap-2 rounded-sm border border-l-[3px] border-border bg-card px-3 py-3 text-left transition-colors hover:bg-secondary',
              TONE[v.status] ?? 'border-l-border',
            )}
          >
            <div className="flex items-start gap-2.5">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-sm bg-secondary text-accent">
                <Icon name="Truck" size={19} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-head text-[0.95em] uppercase tracking-[0.03em]">
                  {v.model || 'Без модели'}
                </span>
                <span className="block truncate text-[0.78em] text-muted-foreground">
                  {v.plate || 'без номера'} · {KIND_LABEL[v.kind] ?? v.kind}
                </span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Icon
                name={shift ? 'UserCheck' : 'UserX'}
                size={14}
                className={cn('flex-none', shift ? 'text-accent' : 'text-muted-foreground')}
              />
              <span className="min-w-0 flex-1 truncate text-[0.82em]">{driver}</span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={cn(
                  'rounded-sm border px-2 py-0.5 text-[0.72em] uppercase tracking-[0.06em]',
                  BADGE[v.status] ?? 'border-border text-muted-foreground',
                )}
              >
                {v.status}
              </span>
              {shift?.endAt && (
                <span className="rounded-sm border border-border px-2 py-0.5 text-[0.72em] text-muted-foreground">
                  вахта до {ruDate(shift.endAt)}
                </span>
              )}
              {svc !== null && svc <= 30 && (
                <span
                  className={cn(
                    'rounded-sm border px-2 py-0.5 text-[0.72em] uppercase tracking-[0.06em]',
                    svc < 0
                      ? 'border-destructive text-destructive'
                      : 'border-amber-500 text-amber-600',
                  )}
                >
                  {svc < 0 ? `ТО просрочено ${-svc} дн.` : `ТО через ${svc} дн.`}
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default FleetTiles;
