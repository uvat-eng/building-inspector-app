import { useMemo, useState } from 'react';
import Panel from '@/components/desk/Panel';
import Empty from '@/components/desk/Empty';
import Icon from '@/components/ui/icon';
import Tag from '@/components/desk/Tag';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ProjectObject } from '@/data/store';
import { usePersistedState } from '@/hooks/usePersistedState';
import { DailyReport, statsOf, useReports } from '@/data/reports';
import { downloadDailyReport, downloadJournal } from '@/lib/reportXls';
import DailyReportForm from '@/components/desk/inspection/DailyReportForm';

interface ReportsCabinetProps {
  object: ProjectObject;
  onBack: () => void;
}

type View = 'root' | 'daily' | 'daily-new' | 'daily-log';

const MONTHS = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
];

const monthKey = (iso: string) => iso.slice(0, 7);
const monthLabel = (key: string) => {
  const [y, m] = key.split('-');
  return `${MONTHS[Number(m) - 1]} ${y}`;
};

const ReportsCabinet = ({ object, onBack }: ReportsCabinetProps) => {
  const { toast } = useToast();
  const { items, loading, remove } = useReports(object.id);
  const [view, setView] = usePersistedState<View>(`gsi-reports-view-${object.id}`, 'root');
  const [editing, setEditing] = useState<DailyReport | null>(null);
  const [openMonth, setOpenMonth] = useState<string | null>(null);

  const months = useMemo(() => {
    const m = new Map<string, DailyReport[]>();
    items.forEach((r) => {
      const k = monthKey(r.date);
      m.set(k, [...(m.get(k) ?? []), r]);
    });
    return [...m.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [items]);

  const totalRows = items.reduce((s, r) => s + r.rows.length, 0);

  if (view === 'daily-new') {
    return (
      <DailyReportForm
        object={object}
        existing={editing}
        onBack={() => {
          setEditing(null);
          setView('daily');
        }}
      />
    );
  }

  const back = () => {
    if (view === 'daily-log') setView('daily');
    else if (view === 'daily') {
      if (openMonth) setOpenMonth(null);
      else setView('root');
    } else onBack();
  };

  const backLabel =
    view === 'root'
      ? 'К меню объекта'
      : view === 'daily'
        ? openMonth
          ? 'Ко всем месяцам'
          : 'К отчётам'
        : 'К ежедневным отчётам';

  const subtitle =
    view === 'root'
      ? 'Отчётные формы инспектора по объекту'
      : view === 'daily'
        ? 'Ежедневные отчёты по месяцам'
        : 'Накопительный журнал замечаний по объекту';

  const openReports = openMonth ? (months.find(([k]) => k === openMonth)?.[1] ?? []) : [];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2.5">
      <button
        type="button"
        onClick={back}
        className="flex w-fit flex-none items-center gap-1.5 rounded-sm border border-border bg-card px-2.5 py-1 text-[0.78em] uppercase tracking-[0.08em] transition-colors hover:border-accent hover:bg-secondary"
      >
        <Icon name="ArrowLeft" size={14} className="text-accent" />
        {backLabel}
      </button>

      <div className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
        <section className="flex-none rounded-sm border border-border border-t-2 border-t-accent bg-card px-4 py-4">
          <p className="text-[0.72em] uppercase tracking-[0.14em] text-muted-foreground">Отчёты</p>
          <h1 className="mt-1 font-head text-[17px] uppercase leading-[1.15] tracking-[0.02em] sm:text-[22px]">
            {object.title}
          </h1>
          <p className="mt-1.5 text-[0.82em] text-muted-foreground">{subtitle}</p>
        </section>

        {view === 'root' && (
          <Panel title="Отчётные формы" note="1" className="flex-none [&>div]:overflow-visible">
            <button
              type="button"
              onClick={() => setView('daily')}
              className="group flex w-full items-center gap-3 bg-card px-4 py-3.5 text-left transition-colors hover:bg-foreground hover:text-background"
            >
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-sm bg-accent text-accent-foreground">
                <Icon name="CalendarDays" fallback="Folder" size={19} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-head text-[0.98em] uppercase tracking-[0.03em]">
                  Ежедневные отчёты
                </span>
                <span className="block truncate text-[0.78em] text-muted-foreground group-hover:text-background/70">
                  {items.length} отчётов · {totalRows} предписаний
                </span>
              </span>
              <Icon name="ChevronRight" size={18} className="flex-none opacity-40" />
            </button>
          </Panel>
        )}

        {view === 'daily' && !openMonth && (
          <>
            <div className="grid flex-none gap-2 sm:grid-cols-2">
              <Button
                onClick={() => {
                  setEditing(null);
                  setView('daily-new');
                }}
                className="h-auto justify-start gap-3 rounded-sm bg-accent px-4 py-3.5 text-left text-accent-foreground hover:bg-accent/90"
              >
                <Icon name="FilePlus2" fallback="FilePlus" size={19} />
                <span className="min-w-0 flex-1">
                  <span className="block font-head text-[0.95em] uppercase tracking-[0.03em]">
                    Создать новый ежедневный отчёт
                  </span>
                  <span className="block truncate text-[0.75em] opacity-80">
                    Объект и подрядчики подставятся сами
                  </span>
                </span>
              </Button>

              <Button
                variant="outline"
                onClick={() => setView('daily-log')}
                className="h-auto justify-start gap-3 rounded-sm px-4 py-3.5 text-left"
              >
                <Icon name="BookOpen" fallback="Book" size={19} className="text-accent" />
                <span className="min-w-0 flex-1">
                  <span className="block font-head text-[0.95em] uppercase tracking-[0.03em]">
                    Сквозной журнал
                  </span>
                  <span className="block truncate text-[0.75em] text-muted-foreground">
                    Накопительно по всем отчётам
                  </span>
                </span>
              </Button>
            </div>

            <Panel title="Хронология по месяцам" note={`${months.length}`} className="flex-none [&>div]:overflow-visible">
              {loading ? (
                <div className="px-4 py-8 text-center text-[0.85em] text-muted-foreground">
                  Загрузка…
                </div>
              ) : months.length === 0 ? (
                <Empty
                  icon="CalendarDays"
                  title="Отчётов пока нет"
                  hint="Создайте первый ежедневный отчёт — папка месяца появится сама."
                />
              ) : (
                <div className="flex flex-col gap-px bg-border">
                  {months.map(([key, list]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setOpenMonth(key)}
                      className="group flex items-center gap-3 bg-card px-4 py-3.5 text-left transition-colors hover:bg-foreground hover:text-background"
                    >
                      <span className="flex h-10 w-10 flex-none items-center justify-center rounded-sm bg-secondary text-accent transition-colors group-hover:bg-accent group-hover:text-accent-foreground">
                        <Icon name="Folder" size={19} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-head text-[0.95em] uppercase tracking-[0.03em]">
                          {monthLabel(key)}
                        </span>
                        <span className="block truncate text-[0.76em] text-muted-foreground group-hover:text-background/70">
                          {list.length} отчётов ·{' '}
                          {list.reduce((s, r) => s + r.rows.length, 0)} предписаний
                        </span>
                      </span>
                      <Icon name="ChevronRight" size={18} className="flex-none opacity-40" />
                    </button>
                  ))}
                </div>
              )}
            </Panel>
          </>
        )}

        {view === 'daily' && openMonth && (
          <Panel title={monthLabel(openMonth)} note={`${openReports.length}`} className="flex-none [&>div]:overflow-visible">
            <div className="flex flex-col gap-px bg-border">
              {openReports.map((r) => {
                const s = statsOf(r.rows);
                return (
                  <div key={r.id} className="bg-card px-4 py-3.5">
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 flex-none items-center justify-center rounded-sm bg-secondary text-accent">
                        <Icon name="FileText" size={18} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-head text-[0.95em] uppercase tracking-[0.03em]">
                          Отчёт от {new Date(r.date).toLocaleDateString('ru')}
                        </p>
                        <p className="mt-0.5 text-[0.76em] text-muted-foreground">
                          {r.author || 'автор не указан'}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <Tag tone="dim">Выдано {s.issued}</Tag>
                          <Tag tone="ok">Устранено {s.fixed}</Tag>
                          {s.open > 0 && <Tag tone="hot">Открыто {s.open}</Tag>}
                          {s.overdue > 0 && <Tag tone="hot">Срок истёк {s.overdue}</Tag>}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => downloadDailyReport(r, object.title, object.field)}
                        className="flex items-center gap-1.5 rounded-sm border border-border px-2.5 py-1 text-[0.74em] uppercase tracking-[0.07em] transition-colors hover:border-accent hover:bg-accent hover:text-accent-foreground"
                      >
                        <Icon name="Download" size={13} />
                        Скачать
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(r);
                          setView('daily-new');
                        }}
                        className="flex items-center gap-1.5 rounded-sm border border-border px-2.5 py-1 text-[0.74em] uppercase tracking-[0.07em] transition-colors hover:border-accent hover:bg-secondary"
                      >
                        <Icon name="Pencil" size={13} />
                        Изменить
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await remove(r.id);
                          toast({ title: 'Отчёт удалён' });
                        }}
                        className="flex items-center gap-1.5 rounded-sm border border-border px-2.5 py-1 text-[0.74em] uppercase tracking-[0.07em] text-muted-foreground transition-colors hover:border-destructive hover:text-destructive"
                      >
                        <Icon name="Trash2" size={13} />
                        Удалить
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>
        )}

        {view === 'daily-log' && (
          <>
            <div className="flex-none">
              <Button
                onClick={() => downloadJournal(items, object.title, object.field)}
                disabled={items.length === 0}
                className="w-full rounded-sm bg-accent font-head uppercase tracking-[0.06em] text-accent-foreground hover:bg-accent/90"
              >
                <Icon name="Download" size={15} className="mr-1.5" />
                Выгрузить журнал замечаний
              </Button>
            </div>

            <Panel title="Накопительный журнал" note={`${totalRows}`} className="flex-none [&>div]:overflow-visible">
              {totalRows === 0 ? (
                <Empty
                  icon="BookOpen"
                  title="Записей пока нет"
                  hint="Журнал наполняется из ежедневных отчётов автоматически."
                />
              ) : (
                <div className="flex flex-col gap-px bg-border">
                  {items
                    .slice()
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .flatMap((rep) =>
                      rep.rows.map((row) => (
                        <div key={row.id} className="bg-card px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-head text-[0.8em] uppercase tracking-[0.06em] text-accent">
                              {new Date(rep.date).toLocaleDateString('ru')}
                            </span>
                            <Tag tone={row.status === 'Устранено' ? 'ok' : 'hot'}>
                              {row.status}
                            </Tag>
                          </div>
                          <p className="mt-1 line-clamp-2 text-[0.85em]">
                            {row.content || 'без описания'}
                          </p>
                          <p className="mt-1 text-[0.74em] text-muted-foreground">
                            {row.contractor || 'без подрядчика'} · {row.place || object.title}
                            {row.category ? ` · ${row.category}` : ''}
                          </p>
                          {(row.photos?.length ?? 0) > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {row.photos!.map((u) => (
                                <a key={u} href={u} target="_blank" rel="noreferrer">
                                  <img
                                    src={u}
                                    alt="фото нарушения"
                                    className="h-14 w-14 rounded-sm border border-border object-cover"
                                  />
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      )),
                    )}
                </div>
              )}
            </Panel>
          </>
        )}
      </div>
    </div>
  );
};

export default ReportsCabinet;