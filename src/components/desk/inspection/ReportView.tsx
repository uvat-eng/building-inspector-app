import { useMemo, useState } from 'react';
import Panel from '@/components/desk/Panel';
import Icon from '@/components/ui/icon';
import Tag from '@/components/desk/Tag';
import { Input } from '@/components/ui/input';
import { ProjectObject } from '@/data/store';
import { DailyReport, ReportRow, byContractor, statsOf } from '@/data/reports';
import { downloadDailyReport } from '@/lib/reportXls';

interface Props {
  object: ProjectObject;
  report: DailyReport;
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

const RowCard = ({ row, n }: { row: ReportRow; n: number }) => {
  const [open, setOpen] = useState(false);
  const overdue =
    row.status !== 'Устранено' && row.dueAt && new Date(row.dueAt) < new Date();

  return (
    <div className="bg-card">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary"
      >
        <span className="mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-sm bg-secondary font-head text-[0.75em] text-accent">
          {n}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-1.5">
            <Tag tone={row.status === 'Устранено' ? 'ok' : 'hot'}>{row.status}</Tag>
            {overdue && <Tag tone="hot">Срок истёк</Tag>}
            {row.stopWork && <Tag tone="hot">Остановка работ</Tag>}
            {row.category && <Tag tone="dim">{row.category}</Tag>}
          </span>
          <span className="mt-1.5 block line-clamp-2 text-[0.86em] leading-snug">
            {row.content || 'без описания'}
          </span>
          <span className="mt-1 block truncate text-[0.74em] text-muted-foreground">
            {row.contractor || 'без подрядчика'} · {row.place || '—'} · срок {ru(row.dueAt)}
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
          <Line label="Пункт" value={String(row.point)} />
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
          <Line label="Характер" value={row.nature} />
          <Line label="Категория" value={row.category} />
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

const ReportView = ({ object, report, onBack }: Props) => {
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'all' | 'open' | 'done'>('all');

  const stats = statsOf(report.rows);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return report.rows.filter((r) => {
      if (filter === 'open' && r.status === 'Устранено') return false;
      if (filter === 'done' && r.status !== 'Устранено') return false;
      if (!needle) return true;
      return [r.content, r.contractor, r.place, r.orderNo, r.normRef, r.category]
        .join(' ')
        .toLowerCase()
        .includes(needle);
    });
  }, [report.rows, q, filter]);

  const groups = useMemo(() => byContractor(rows), [rows]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2.5">
      <button
        type="button"
        onClick={onBack}
        className="flex w-fit flex-none items-center gap-1.5 rounded-sm border border-border bg-card px-2.5 py-1 text-[0.78em] uppercase tracking-[0.08em] transition-colors hover:border-accent hover:bg-secondary"
      >
        <Icon name="ArrowLeft" size={14} className="text-accent" />К списку отчётов
      </button>

      <div className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
        <section className="flex-none rounded-sm border border-border border-t-2 border-t-accent bg-card px-4 py-4">
          <p className="text-[0.72em] uppercase tracking-[0.14em] text-muted-foreground">
            Ежедневный отчёт по предписаниям
          </p>
          <h1 className="mt-1 font-head text-[17px] uppercase leading-[1.15] tracking-[0.02em] sm:text-[22px]">
            {ru(report.date)}
          </h1>
          <p className="mt-1.5 text-[0.82em] text-muted-foreground">
            {object.title} · {report.author || 'автор не указан'}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {report.fileUrl && (
              <a
                href={report.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 rounded-sm border border-border px-2.5 py-1 text-[0.74em] uppercase tracking-[0.07em] transition-colors hover:border-accent hover:bg-secondary"
              >
                <Icon name="FileSpreadsheet" fallback="FileText" size={13} className="text-accent" />
                Исходный файл
              </a>
            )}
            <button
              type="button"
              onClick={() => downloadDailyReport(report, object.title, object.field)}
              className="flex items-center gap-1.5 rounded-sm border border-border px-2.5 py-1 text-[0.74em] uppercase tracking-[0.07em] transition-colors hover:border-accent hover:bg-accent hover:text-accent-foreground"
            >
              <Icon name="Download" size={13} />
              Выгрузить
            </button>
          </div>
        </section>

        <Panel title="Сводка" note={`${report.rows.length} строк`}>
          <div className="grid grid-cols-3 gap-px bg-border sm:grid-cols-6">
            {[
              ['Выдано', stats.issued],
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

        <Panel title="Поиск">
          <div className="flex flex-col gap-2 p-3.5">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="подрядчик, объект, № предписания, текст"
              className="rounded-sm"
            />
            <div className="flex gap-1.5">
              {(
                [
                  ['all', 'Все'],
                  ['open', 'Не устранено'],
                  ['done', 'Устранено'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter(key)}
                  className={`flex-1 rounded-sm border px-2 py-1.5 text-[0.75em] uppercase tracking-[0.06em] transition-colors ${
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

        {groups.map(([name, list]) => {
          const s = statsOf(list);
          return (
            <Panel
              key={name}
              title={name}
              note={`${list.length}`}
             
            >
              <div className="flex flex-wrap gap-1.5 border-b border-border px-4 py-2">
                <Tag tone="dim">Выдано {s.issued}</Tag>
                <Tag tone="ok">Устранено {s.fixed}</Tag>
                {s.open > 0 && <Tag tone="hot">Открыто {s.open}</Tag>}
                {s.overdue > 0 && <Tag tone="hot">Срок истёк {s.overdue}</Tag>}
              </div>
              <div className="flex flex-col gap-px bg-border">
                {list.map((r, i) => (
                  <RowCard key={r.id} row={r} n={i + 1} />
                ))}
              </div>
            </Panel>
          );
        })}

        {rows.length === 0 && (
          <div className="rounded-sm border border-border bg-card px-4 py-8 text-center">
            <Icon name="SearchX" fallback="Search" size={26} className="mx-auto text-muted-foreground/50" />
            <p className="mt-2 text-[0.85em] text-muted-foreground">Ничего не найдено</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportView;
