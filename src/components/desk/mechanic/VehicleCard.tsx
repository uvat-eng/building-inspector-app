import Panel from '@/components/desk/Panel';
import Empty from '@/components/desk/Empty';
import Icon from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import type { TagTone } from '@/data/mock';
import {
  KIND_LABEL,
  LOG_ICON,
  LOG_LABEL,
  LogKind,
  STATUSES,
  Vehicle,
  VehicleLog,
  VehicleStatus,
  fmtDate,
} from '@/data/vehicles';

export const STATUS_TONE = (s: VehicleStatus): TagTone =>
  s === 'На линии' ? 'ok' : s === 'ТО' ? 'wait' : s === 'Ремонт' ? 'hot' : 'dim';

const AMOUNT_UNIT: Record<LogKind, string> = {
  service: '₽',
  fuel: 'л',
  waybill: 'км за смену',
};

export interface VehicleCardProps {
  vehicle: Vehicle;
  logs: VehicleLog[];
  onStatus: (status: VehicleStatus) => void;
  onLog: (kind: LogKind) => void;
  onEdit: () => void;
  onRemove: () => void;
  onRemoveLog: (id: string) => void;
}

const VehicleCard = ({
  vehicle,
  logs,
  onStatus,
  onLog,
  onEdit,
  onRemove,
  onRemoveLog,
}: VehicleCardProps) => {
  const facts: { label: string; value: string }[] = [
    { label: 'Тип', value: KIND_LABEL[vehicle.kind] },
    { label: 'Водитель', value: vehicle.driver || 'не закреплён' },
    { label: 'Пробег', value: `${vehicle.odometer || 0} км` },
    { label: 'Норма расхода', value: `${vehicle.fuelNorm || 0} л/100 км` },
    { label: 'Ближайшее ТО', value: fmtDate(vehicle.serviceAt) },
    { label: 'ОСАГО до', value: fmtDate(vehicle.osagoTo) },
    { label: 'Примечание', value: vehicle.note || '—' },
  ];

  return (
    <>
      <section className="flex-none rounded-sm border border-border border-t-2 border-t-accent bg-card px-4 py-4 sm:px-6 sm:py-5">
        <h1 className="font-head text-[19px] uppercase leading-[1.15] tracking-[0.02em] sm:text-[28px]">
          {vehicle.plate} <span className="text-accent">{vehicle.model}</span>
        </h1>

        <div className="mt-4 grid gap-px border-t border-border bg-border pt-px sm:grid-cols-2">
          {facts.map((f) => (
            <div key={f.label} className="bg-card px-3 py-2.5">
              <p className="text-[0.7em] uppercase tracking-[0.1em] text-muted-foreground">
                {f.label}
              </p>
              <p className="mt-1 text-[0.92em]">{f.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 space-y-1.5">
          <p className="text-[0.7em] uppercase tracking-[0.1em] text-muted-foreground">Статус</p>
          <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-4">
            {STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onStatus(s)}
                className={cn(
                  'px-2 py-2 text-[0.75em] uppercase tracking-[0.08em] transition-colors',
                  vehicle.status === s
                    ? 'bg-accent text-accent-foreground'
                    : 'bg-card hover:bg-secondary',
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {(['service', 'fuel', 'waybill'] as LogKind[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => onLog(k)}
              className="flex items-center gap-1.5 rounded-sm bg-accent px-2.5 py-1 text-[0.78em] uppercase tracking-[0.08em] text-accent-foreground transition-colors hover:bg-accent/90"
            >
              <Icon name={LOG_ICON[k]} fallback="File" size={14} />
              {k === 'service' ? 'Записать ТО' : LOG_LABEL[k]}
            </button>
          ))}
          <button
            type="button"
            onClick={onEdit}
            className="flex items-center gap-1.5 rounded-sm border border-border bg-card px-2.5 py-1 text-[0.78em] uppercase tracking-[0.08em] transition-colors hover:border-accent hover:bg-secondary"
          >
            <Icon name="Pencil" size={14} />
            Изменить
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="flex items-center gap-1.5 rounded-sm border border-border bg-card px-2.5 py-1 text-[0.78em] uppercase tracking-[0.08em] transition-colors hover:border-destructive hover:text-destructive"
          >
            <Icon name="Trash2" size={14} />
            Удалить технику
          </button>
        </div>
      </section>

      <Panel title="Журнал" note={`${logs.length}`}>
        {logs.length === 0 ? (
          <Empty icon="ClipboardList" title="Записей нет" hint="Отметьте ТО, заправку или смену." />
        ) : (
          logs.map((l) => (
            <div
              key={l.id}
              className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0"
            >
              <span className="flex h-9 w-9 flex-none items-center justify-center rounded-sm bg-secondary text-muted-foreground">
                <Icon name={LOG_ICON[l.kind]} fallback="File" size={17} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-head text-[0.95em] uppercase tracking-[0.02em]">
                  {LOG_LABEL[l.kind]}
                </span>
                <span className="block truncate text-[0.76em] text-muted-foreground">
                  {fmtDate(l.date)} · {l.odometer || 0} км · {l.amount || 0} {AMOUNT_UNIT[l.kind]}
                  {l.content ? ` · ${l.content}` : ''}
                </span>
              </span>
              <button
                type="button"
                title="Удалить"
                onClick={() => onRemoveLog(l.id)}
                className="flex h-8 w-8 flex-none items-center justify-center rounded-sm bg-secondary transition-colors hover:bg-destructive hover:text-destructive-foreground"
              >
                <Icon name="Trash2" size={15} />
              </button>
            </div>
          ))
        )}
      </Panel>
    </>
  );
};

export default VehicleCard;
