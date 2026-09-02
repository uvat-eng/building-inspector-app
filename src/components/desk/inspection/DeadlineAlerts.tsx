import { useMemo, useState } from 'react';
import Panel from '@/components/desk/Panel';
import Icon from '@/components/ui/icon';
import Tag from '@/components/desk/Tag';
import {
  ArchiveRow,
  DailyReport,
  collectAlerts,
  daysLeft,
  deadlineLabel,
} from '@/data/reports';

interface Props {
  reports: DailyReport[];
  compact?: boolean;
  onOpenArchive?: () => void;
}

const ru = (iso: string) => (iso ? new Date(iso).toLocaleDateString('ru') : '—');

const Row = ({ row }: { row: ArchiveRow }) => {
  const d = daysLeft(row.dueAt) ?? 0;
  const hot = d < 0;
  return (
    <div className="bg-card px-4 py-2.5">
      <div className="flex items-center gap-2">
        <Icon
          name={hot ? 'AlarmClock' : 'Clock'}
          size={14}
          className={hot ? 'flex-none text-destructive' : 'flex-none text-accent'}
        />
        <span
          className={`font-head text-[0.78em] uppercase tracking-[0.06em] ${
            hot ? 'text-destructive' : 'text-accent'
          }`}
        >
          {deadlineLabel(row.dueAt)}
        </span>
        <span className="ml-auto text-[0.72em] text-muted-foreground">до {ru(row.dueAt)}</span>
      </div>
      <p className="mt-1 line-clamp-2 text-[0.84em] leading-snug">
        {row.content || 'без описания'}
      </p>
      <p className="mt-1 truncate text-[0.73em] text-muted-foreground">
        {row.contractor || 'без подрядчика'} · {row.place || '—'}
        {row.orderNo ? ` · ${row.orderNo}` : ''}
      </p>
      {row.stopWork && (
        <div className="mt-1.5">
          <Tag tone="hot">Остановка работ</Tag>
        </div>
      )}
    </div>
  );
};

const DeadlineAlerts = ({ reports, compact, onOpenArchive }: Props) => {
  const alerts = useMemo(() => collectAlerts(reports), [reports]);
  const [open, setOpen] = useState(!compact);

  if (alerts.total === 0) return null;

  const list = [...alerts.overdue, ...alerts.soon];
  const shown = compact && !open ? [] : list.slice(0, 40);

  return (
    <Panel
      title="Контроль сроков"
      note={`${alerts.total}`}
      className="border-t-destructive"
    >
      <button
        type="button"
        onClick={() => (compact ? setOpen((p) => !p) : onOpenArchive?.())}
        className="flex w-full items-center gap-2 border-b border-border px-4 py-2.5 text-left transition-colors hover:bg-secondary"
      >
        <span className="flex flex-wrap gap-1.5">
          {alerts.overdue.length > 0 && (
            <Tag tone="hot">Просрочено {alerts.overdue.length}</Tag>
          )}
          {alerts.soon.length > 0 && <Tag tone="dim">Срок близко {alerts.soon.length}</Tag>}
        </span>
        <Icon
          name={compact ? (open ? 'ChevronUp' : 'ChevronDown') : 'ChevronRight'}
          size={16}
          className="ml-auto flex-none opacity-40"
        />
      </button>

      {shown.length > 0 && (
        <div className="flex flex-col gap-px bg-border">
          {shown.map((r) => (
            <Row key={`${r.orderNo}-${r.point}-${r.id}`} row={r} />
          ))}
          {list.length > shown.length && (
            <div className="bg-card px-4 py-2 text-center text-[0.75em] text-muted-foreground">
              и ещё {list.length - shown.length}
            </div>
          )}
        </div>
      )}
    </Panel>
  );
};

export default DeadlineAlerts;
