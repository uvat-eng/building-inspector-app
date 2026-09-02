import { useMemo, useState } from 'react';
import Panel from '@/components/desk/Panel';
import Empty from '@/components/desk/Empty';
import Icon from '@/components/ui/icon';
import Tag from '@/components/desk/Tag';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ProjectObject } from '@/data/store';
import {
  ArchiveRow,
  DailyReport,
  SOON_DAYS,
  buildArchive,
  daysLeft,
  deadlineLabel,
  statsOf,
} from '@/data/reports';
import { downloadArchive } from '@/lib/reportXls';
import DeadlineAlerts from '@/components/desk/inspection/DeadlineAlerts';

interface Props {
  object: ProjectObject;
  reports: DailyReport[];
  onBack: () => void;
}

const ru = (iso: string) => (iso ? new Date(iso).toLocaleDateString('ru') : '—');

const Line = ({ label, value }: { label: string; value?: string }) =>
  value ? (
    <div className="flex gap-2 text-[0.8em]">
      <span className="w-[130px] flex-none uppercase tracking-[0.06em] text-muted-foreground">
        {label}
      </span>
      <span className="min-w-0 flex-1 whitespace-pre-wrap">{value}</span>
    </div>
  ) : null;

const Card = ({ row }: { row: ArchiveRow }) => {
  const [open, setOpen] = useState(false);
  const overdue = row.status !== 'Устранено' && row.dueAt && new Date(row.dueAt) < new Date();

  return (
    <div className="bg-card">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary"
      >
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-1.5">
            <Tag tone={row.status === 'Устранено' ? 'ok' : 'hot'}>{row.status}</Tag>
            {overdue && <Tag tone="hot">Срок истёк</Tag>}
            {row.stopWork && <Tag tone="hot">Остановка работ</Tag>}
            {row.status !== 'Устранено' &&
              (daysLeft(row.dueAt) ?? 99) >= 0 &&
              (daysLeft(row.dueAt) ?? 99) <= SOON_DAYS && (
                <Tag tone="dim">{deadlineLabel(row.dueAt)}</Tag>
              )}
            {row.seen > 1 && <Tag tone="dim">В {row.seen} отчётах</Tag>}
          </span>
          <span className="mt-1.5 block line-clamp-2 text-[0.86em] leading-snug">
            {row.content || 'без описания'}
          </span>
          <span className="mt-1 block truncate text-[0.74em] text-muted-foreground">
            {row.orderNo || 'без номера'} · {row.place || '—'} · срок {ru(row.dueAt)}
          </span>
        </span>
        <Icon
          name={open ? 'ChevronUp' : 'ChevronDown'}
          size={17}
          className="mt-1 flex-none opacity-40"
        />
      </button>

      {open && (
        <div className="flex flex-col gap-1.5 border-t border-border bg-secondary/40 px-4 py-3">
          <Line label="Подрядчик" value={row.contractor} />
          <Line label="Объект" value={row.place} />
          <Line label="Содержание" value={row.content} />
          <Line label="Норматив" value={row.normRef} />
          <Line label="Проект. док." value={row.docRef} />
          <Line label="№ предписания" value={row.orderNo} />
          <Line label="Выдано" value={ru(row.issuedAt)} />
          <Line label="Срок" value={ru(row.dueAt)} />
          <Line label="Факт" value={row.factAt ? ru(row.factAt) : ''} />
          <Line label="Продление" value={row.extension} />
          <Line label="Ответственный" value={row.responsible} />
          <Line label="Инженер СК" value={row.inspector} />
          <Line label="Категория" value={row.category} />
          <Line label="Последний отчёт" value={ru(row.lastDate)} />
          {(row.photos?.length ?? 0) > 0 && (
            <div className="mt-1 flex flex-wrap gap-1.5">
              {row.photos!.map((u) => (
                <a key={u} href={u} target="_blank" rel="noreferrer">
                  <img
                    src={u}
                    alt="фото"
                    className="h-14 w-14 rounded-sm border border-border object-cover"
                  />
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const ArchiveView = ({ object, reports, onBack }: Props) => {
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'all' | 'open' | 'soon' | 'overdue' | 'done'>('all');

  const archive = useMemo(() => buildArchive(reports), [reports]);
  const stats = statsOf(archive);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const now = new Date();
    return archive.filter((r) => {
      if (filter === 'open' && r.status === 'Устранено') return false;
      if (filter === 'done' && r.status !== 'Устранено') return false;
      if (filter === 'overdue') {
        if (r.status === 'Устранено') return false;
        if (!r.dueAt || new Date(r.dueAt) >= now) return false;
      }
      if (filter === 'soon') {
        if (r.status === 'Устранено') return false;
        const d = daysLeft(r.dueAt);
        if (d === null || d < 0 || d > SOON_DAYS) return false;
      }
      if (!needle) return true;
      return [r.content, r.contractor, r.place, r.orderNo, r.normRef, r.category]
        .join(' ')
        .toLowerCase()
        .includes(needle);
    });
  }, [archive, q, filter]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2.5">
      <button
        type="button"
        onClick={onBack}
        className="flex w-fit flex-none items-center gap-1.5 rounded-sm border border-border bg-card px-2.5 py-1 text-[0.78em] uppercase tracking-[0.08em] transition-colors hover:border-accent hover:bg-secondary"
      >
        <Icon name="ArrowLeft" size={14} className="text-accent" />К отчётам
      </button>

      <div className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
        <section className="flex-none rounded-sm border border-border border-t-2 border-t-accent bg-card px-4 py-4">
          <p className="text-[0.72em] uppercase tracking-[0.14em] text-muted-foreground">
            Общий архив
          </p>
          <h1 className="mt-1 font-head text-[17px] uppercase leading-[1.15] tracking-[0.02em] sm:text-[22px]">
            Все выданные предписания
          </h1>
          <p className="mt-1.5 text-[0.82em] text-muted-foreground">
            {object.title} · {archive.length} уникальных из {reports.length} отчётов
          </p>
        </section>

        <DeadlineAlerts reports={reports} compact />

        <Panel title="Сводка" className="flex-none [&>div]:overflow-visible">
          <div className="grid grid-cols-3 gap-px bg-border sm:grid-cols-6">
            {[
              ['Всего', stats.issued],
              ['С остановкой', stats.stop],
              ['Устранено', stats.fixed],
              ['В срок', stats.inTime],
              ['Не устранено', stats.open],
              ['Срок истёк', stats.overdue],
            ].map(([label, value]) => (
              <div key={String(label)} className="bg-card px-3 py-2.5 text-center">
                <p className="font-head text-[1.4em] text-accent">{value}</p>
                <p className="text-[0.68em] uppercase tracking-[0.08em] text-muted-foreground">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </Panel>

        <div className="flex-none">
          <Button
            onClick={() => downloadArchive(archive, object.title, object.field)}
            disabled={archive.length === 0}
            className="w-full rounded-sm bg-accent font-head uppercase tracking-[0.06em] text-accent-foreground hover:bg-accent/90"
          >
            <Icon name="Download" size={15} className="mr-1.5" />
            Выгрузить архив в Excel
          </Button>
        </div>

        <Panel title="Поиск" className="flex-none [&>div]:overflow-visible">
          <div className="flex flex-col gap-2 p-3.5">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="подрядчик, объект, № предписания, текст"
              className="rounded-sm"
            />
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-5">
              {(
                [
                  ['all', 'Все'],
                  ['open', 'Не устранено'],
                  ['soon', 'Срок близко'],
                  ['overdue', 'Срок истёк'],
                  ['done', 'Устранено'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter(key)}
                  className={`rounded-sm border px-2 py-1.5 text-[0.75em] uppercase tracking-[0.06em] transition-colors ${
                    filter === key
                      ? 'border-accent bg-accent text-accent-foreground'
                      : 'border-border hover:bg-secondary'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </Panel>

        <Panel
          title="Предписания"
          note={`${rows.length}`}
          className="flex-none [&>div]:overflow-visible"
        >
          {rows.length === 0 ? (
            <Empty
              icon="Archive"
              title="Записей нет"
              hint="Архив наполняется из загруженных ежедневных отчётов."
            />
          ) : (
            <div className="flex flex-col gap-px bg-border">
              {rows.map((r) => (
                <Card key={`${r.orderNo}-${r.point}-${r.id}`} row={r} />
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
};

export default ArchiveView;
