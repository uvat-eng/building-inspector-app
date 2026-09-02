import { useMemo, useState } from 'react';
import Panel from '@/components/desk/Panel';
import Empty from '@/components/desk/Empty';
import Icon from '@/components/ui/icon';
import Tag from '@/components/desk/Tag';
import { cn } from '@/lib/utils';
import { useObjects } from '@/data/store';
import { useInspectorsRollup, useObjectsRollup, InspectorRollup } from '@/data/rollup';
import { fmtHours, MONTHS, fmtDay } from '@/data/timesheet';

const shiftText = (i: InspectorRollup) => {
  if (!i.shift) return 'вахта не начата';
  const s = i.shift;
  const period = `${fmtDay(s.start)} — ${fmtDay(s.end)}`;
  if (s.open) return `на вахте с ${fmtDay(s.start)} · ${s.workDays} см. · ${fmtHours(s.hours)} ч`;
  return `вахта ${period} закрыта · МО ${s.moDays} дн. с ${fmtDay(s.moStart)}`;
};

const InspectorsRollup = () => {
  const { list: objects } = useObjects();
  const { items, loading } = useInspectorsRollup();
  const { items: byObject } = useObjectsRollup();
  const [open, setOpen] = useState<string | null>(null);
  const [tab, setTab] = useState<'people' | 'objects'>('people');

  const now = new Date();
  const objTitle = useMemo(() => {
    const map = new Map(objects.map((o) => [o.id, o.title]));
    return (id: string) => map.get(id) ?? 'Объект снят с учёта';
  }, [objects]);

  const onShift = items.filter((i) => i.onShift).length;
  const totals = items.reduce(
    (a, i) => ({
      defects: a.defects + i.defects,
      orders: a.orders + i.orders,
      inspections: a.inspections + i.inspections,
    }),
    { defects: 0, orders: 0, inspections: 0 },
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <section className="flex-none rounded-sm border border-border border-t-2 border-t-accent bg-card px-4 py-4">
        <h1 className="font-head text-[17px] uppercase leading-[1.15] tracking-[0.02em] sm:text-[22px]">
          Работа инспекторов
        </h1>
        <p className="mt-1.5 text-[0.82em] text-muted-foreground">
          {items.length} инспекторов · на вахте {onShift} · проверок {totals.inspections} ·
          замечаний {totals.defects} · предписаний {totals.orders}
        </p>
      </section>

      <div className="flex flex-none gap-1">
        {(
          [
            ['people', 'По инспекторам', 'Users'],
            ['objects', 'По объектам', 'Building2'],
          ] as const
        ).map(([id, label, icon]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-sm border px-3 py-2 text-[0.8em] uppercase tracking-[0.06em] transition-colors',
              tab === id
                ? 'border-accent bg-accent text-accent-foreground'
                : 'border-border bg-card hover:bg-secondary',
            )}
          >
            <Icon name={icon} size={14} />
            {label}
          </button>
        ))}
      </div>

      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
        {tab === 'people' ? (
          <Panel title={`${MONTHS[now.getMonth()]} ${now.getFullYear()}`} note={`${items.length}`}>
            {loading ? (
              <Empty icon="Loader2" title="Загрузка…" hint="Собираем данные инспекторов." />
            ) : items.length === 0 ? (
              <Empty
                icon="Users"
                title="Инспекторов нет"
                hint="Зарегистрируйте инспекторов в разделе «Сотрудники»."
              />
            ) : (
              items.map((i) => (
                <div key={i.id} className="border-b border-border last:border-b-0">
                  <button
                    type="button"
                    onClick={() => setOpen(open === i.id ? null : i.id)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/50"
                  >
                    <span
                      className={cn(
                        'flex h-9 w-9 flex-none items-center justify-center rounded-sm',
                        i.onShift
                          ? 'bg-accent text-accent-foreground'
                          : 'bg-secondary text-muted-foreground',
                      )}
                    >
                      <Icon name={i.onShift ? 'HardHat' : 'Home'} size={17} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-head text-[0.95em] uppercase tracking-[0.02em]">
                        {i.fio}
                      </span>
                      <span className="block truncate text-[0.76em] text-muted-foreground">
                        {shiftText(i)}
                      </span>
                    </span>
                    <span className="flex flex-none items-center gap-1.5">
                      <Tag tone={i.onShift ? 'ok' : 'dim'}>
                        {i.monthDays} см. · {fmtHours(i.monthHours)} ч
                      </Tag>
                      <Icon
                        name="ChevronDown"
                        size={15}
                        className={cn(
                          'text-muted-foreground transition-transform',
                          open === i.id && 'rotate-180',
                        )}
                      />
                    </span>
                  </button>

                  {open === i.id && (
                    <div className="space-y-2.5 bg-secondary/30 px-4 pb-3.5 pt-1">
                      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-sm bg-border sm:grid-cols-4">
                        {[
                          ['ClipboardCheck', 'Проверок', i.inspections],
                          ['TriangleAlert', 'Замечаний', i.defects],
                          ['FileWarning', 'Предписаний', i.orders],
                          ['FolderCheck', 'Папок док.', i.docFolders],
                        ].map(([icon, label, val]) => (
                          <span
                            key={label as string}
                            className="flex items-center gap-2 bg-card px-3 py-2.5"
                          >
                            <Icon name={icon as string} size={15} className="text-accent" />
                            <span className="min-w-0">
                              <span className="block font-head text-[1em] leading-tight">
                                {val as number}
                              </span>
                              <span className="block truncate text-[0.68em] uppercase tracking-[0.06em] text-muted-foreground">
                                {label as string}
                              </span>
                            </span>
                          </span>
                        ))}
                      </div>

                      {i.monthMO > 0 && (
                        <p className="text-[0.78em] text-warning">
                          Межвахтовый отдых в этом месяце: {i.monthMO} дн.
                        </p>
                      )}

                      <div>
                        <p className="mb-1 text-[0.7em] uppercase tracking-[0.12em] text-muted-foreground">
                          Вахты
                        </p>
                        {i.shifts.length === 0 ? (
                          <p className="text-[0.8em] text-muted-foreground">Смен пока нет.</p>
                        ) : (
                          <div className="space-y-1">
                            {i.shifts.map((s) => (
                              <div
                                key={s.start}
                                className="flex items-center gap-2 rounded-sm bg-card px-2.5 py-1.5 text-[0.78em]"
                              >
                                <Icon
                                  name={s.open ? 'PlayCircle' : 'CheckCircle2'}
                                  size={13}
                                  className={s.open ? 'text-accent' : 'text-muted-foreground'}
                                />
                                <span className="min-w-0 flex-1 truncate">
                                  {fmtDay(s.start)} — {fmtDay(s.end)} · {s.workDays} см. ·{' '}
                                  {fmtHours(s.hours)} ч
                                  {s.moDays ? ` · МО ${s.moDays} дн.` : ''}
                                </span>
                                {!!s.objects.length && (
                                  <span className="hidden truncate text-muted-foreground sm:block">
                                    {s.objects.join(', ')}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <p className="text-[0.74em] text-muted-foreground">
                        {i.org || 'организация не указана'}
                        {i.phone ? ` · ${i.phone}` : ''}
                        {i.lastActivity
                          ? ` · последняя проверка ${new Date(i.lastActivity).toLocaleDateString('ru')}`
                          : ''}
                      </p>
                    </div>
                  )}
                </div>
              ))
            )}
          </Panel>
        ) : (
          <Panel title="Объекты в работе" note={`${byObject.length}`}>
            {byObject.length === 0 ? (
              <Empty
                icon="Building2"
                title="Данных нет"
                hint="Проверки появятся после выездов инспекторов."
              />
            ) : (
              byObject.map((o) => (
                <div
                  key={o.objectId}
                  className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0"
                >
                  <span className="flex h-9 w-9 flex-none items-center justify-center rounded-sm bg-accent text-accent-foreground">
                    <Icon name="Building2" size={17} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-head text-[0.95em] uppercase tracking-[0.02em]">
                      {objTitle(o.objectId)}
                    </span>
                    <span className="block truncate text-[0.76em] text-muted-foreground">
                      инспекторов {o.inspectors} · проверок {o.inspections} · замечаний {o.defects}{' '}
                      · предписаний {o.orders} · папок {o.folders}
                    </span>
                  </span>
                  {o.lastActivity && (
                    <Tag tone="dim">{new Date(o.lastActivity).toLocaleDateString('ru')}</Tag>
                  )}
                </div>
              ))
            )}
          </Panel>
        )}
      </div>
    </div>
  );
};

export default InspectorsRollup;
