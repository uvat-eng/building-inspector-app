import { useMemo, useState } from 'react';
import Panel from '@/components/desk/Panel';
import Empty from '@/components/desk/Empty';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ROLE_LABEL } from '@/data/profile';
import TrackerMap from '@/components/desk/tracker/TrackerMap';
import {
  MonthRow,
  TrackDay,
  TrackPoint,
  buildMonth,
  fetchMonth,
  fetchTrack,
  fmtMin,
  ruTime,
  useOnline,
  useTrackDays,
} from '@/data/tracker';

type Tab = 'online' | 'archive' | 'month';

const ruDate = (v: string) => {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString('ru');
};

const ymTitle = (ym: string) => {
  const M = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
  ];
  const [y, m] = ym.split('-');
  return M[Number(m) - 1] ? `${M[Number(m) - 1]} ${y}` : ym;
};

const csv = (rows: MonthRow[], ym: string) => {
  const head = 'Сотрудник;Роль;Дней;Пробег, км;В движении, мин;Простой, мин';
  const body = rows
    .map(
      (r) =>
        `${r.fio};${ROLE_LABEL[r.role as keyof typeof ROLE_LABEL] ?? r.role};` +
        `${r.days};${r.km.toFixed(1)};${r.moveMin};${r.idleMin}`,
    )
    .join('\n');
  const blob = new Blob(['\ufeff' + head + '\n' + body], {
    type: 'text/csv;charset=utf-8',
  });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `Трекер_свод_${ym}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};

const TrackerCabinet = () => {
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>('online');
  const [ym, setYm] = useState(() => new Date().toISOString().slice(0, 7));

  const { items: online, loading: onLoading } = useOnline(tab === 'online');
  const { items: days, loading: dayLoading } = useTrackDays(ym, tab === 'archive');

  const [openDay, setOpenDay] = useState<string | null>(null);
  const [track, setTrack] = useState<TrackPoint[] | undefined>();
  const [trackTitle, setTrackTitle] = useState('');

  const [month, setMonth] = useState<MonthRow[]>([]);
  const [monthLoaded, setMonthLoaded] = useState('');
  const [busy, setBusy] = useState(false);

  const showTrack = async (d: TrackDay) => {
    const pts = await fetchTrack(d.userId, d.day);
    setTrack(pts);
    setTrackTitle(`${d.fio} · ${ruDate(d.day)}`);
    setTab('online');
  };

  const loadMonth = async (targetYm: string) => {
    setBusy(true);
    try {
      const d = await fetchMonth(targetYm);
      setMonth(d.rows);
      setMonthLoaded(d.createdAt);
    } finally {
      setBusy(false);
    }
  };

  const rebuild = async () => {
    setBusy(true);
    try {
      const d = await buildMonth(ym);
      setMonth(d.rows);
      setMonthLoaded(new Date().toISOString());
      toast({ title: 'Свод пересчитан' });
    } finally {
      setBusy(false);
    }
  };

  const dayStats = useMemo(() => {
    const km = days.reduce((s, d) => s + d.distanceKm, 0);
    const idle = days.reduce((s, d) => s + d.idleMin, 0);
    const people = new Set(days.map((d) => d.userId)).size;
    return { km, idle, people, records: days.length };
  }, [days]);

  const byDay = useMemo(() => {
    const map = new Map<string, TrackDay[]>();
    days.forEach((d) => map.set(d.day, [...(map.get(d.day) ?? []), d]));
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [days]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-none flex-wrap gap-1.5">
        {(
          [
            { k: 'online' as const, l: 'Онлайн-карта', i: 'MapPinned' },
            { k: 'archive' as const, l: 'Дневной архив', i: 'CalendarClock' },
            { k: 'month' as const, l: 'Месячный свод', i: 'Table' },
          ]
        ).map((t) => (
          <button
            key={t.k}
            type="button"
            onClick={() => {
              setTab(t.k);
              if (t.k !== 'online') {
                setTrack(undefined);
                setTrackTitle('');
              }
              if (t.k === 'month' && monthLoaded !== ym) loadMonth(ym);
            }}
            className={cn(
              'flex items-center gap-2 rounded-sm border px-3.5 py-2 text-[0.84em] font-head uppercase tracking-[0.05em] transition-colors',
              tab === t.k
                ? 'border-accent bg-accent text-accent-foreground'
                : 'border-border bg-card hover:bg-secondary',
            )}
          >
            <Icon name={t.i} size={15} />
            {t.l}
          </button>
        ))}
      </div>

      {tab === 'online' && (
        <>
          <Panel
            title={track ? `Маршрут · ${trackTitle}` : 'Кто сейчас на линии'}
            note={track ? undefined : `${online.length} онлайн`}
            className="flex-none"
            action={
              track ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setTrack(undefined);
                    setTrackTitle('');
                  }}
                  className="ml-auto gap-1.5 rounded-sm"
                >
                  <Icon name="X" size={14} />
                  Сбросить маршрут
                </Button>
              ) : undefined
            }
          >
            <div className="p-3">
              <TrackerMap online={online} track={track} className="h-[380px] w-full" />
            </div>
          </Panel>

          {!track && (
            <Panel title="Онлайн-сотрудники" note={`${online.length}`} className="flex-none">
              {onLoading && !online.length ? (
                <Empty icon="Loader" title="Загружаем" hint="Секунду." />
              ) : !online.length ? (
                <Empty
                  icon="MapPinOff"
                  title="Сейчас никого на связи"
                  hint="Появятся, когда инспектор или водитель откроют приложение."
                />
              ) : (
                <div className="flex flex-col divide-y divide-border">
                  {online.map((u) => (
                    <div key={u.userId} className="flex items-center gap-3 px-4 py-2.5">
                      <span
                        className={cn(
                          'flex h-9 w-9 flex-none items-center justify-center rounded-sm',
                          u.role === 'driver'
                            ? 'bg-blue-600/10 text-blue-600'
                            : 'bg-accent/10 text-accent',
                        )}
                      >
                        <Icon name={u.role === 'driver' ? 'Truck' : 'HardHat'} size={16} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[0.88em]">{u.fio}</span>
                        <span className="block truncate text-[0.74em] text-muted-foreground">
                          {ROLE_LABEL[u.role as keyof typeof ROLE_LABEL] ?? u.role} · обновлено в{' '}
                          {ruTime(u.at)}
                        </span>
                      </span>
                      <span className="flex items-center gap-1.5 text-[0.74em] text-emerald-600">
                        <span className="h-2 w-2 rounded-full bg-emerald-600" />
                        онлайн
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          )}
        </>
      )}

      {tab === 'archive' && (
        <>
          <div className="grid flex-none gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { l: 'Записей за месяц', v: String(dayStats.records), i: 'CalendarClock' },
              { l: 'Сотрудников', v: String(dayStats.people), i: 'Users' },
              { l: 'Пробег всего, км', v: dayStats.km.toFixed(0), i: 'Route' },
              { l: 'Простой всего', v: fmtMin(dayStats.idle), i: 'Timer' },
            ].map((c) => (
              <div
                key={c.l}
                className="flex items-center gap-3 rounded-sm border border-border bg-card px-4 py-3.5"
              >
                <span className="flex h-10 w-10 flex-none items-center justify-center rounded-sm bg-secondary text-accent">
                  <Icon name={c.i} fallback="Circle" size={19} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-head text-[1.15em] leading-none">
                    {c.v}
                  </span>
                  <span className="mt-1 block truncate text-[0.72em] uppercase tracking-[0.08em] text-muted-foreground">
                    {c.l}
                  </span>
                </span>
              </div>
            ))}
          </div>

          <Panel
            title="Архив по дням"
            note={`${days.length} записей`}
            className="min-h-0 flex-1"
            action={
              <input
                type="month"
                value={ym}
                onChange={(e) => setYm(e.target.value)}
                className="ml-auto rounded-sm border border-border bg-card px-2 py-1 text-[0.8em]"
              />
            }
          >
            {dayLoading && !days.length ? (
              <Empty icon="Loader" title="Загружаем" hint="Секунду." />
            ) : !days.length ? (
              <Empty
                icon="CalendarClock"
                title="Данных за месяц нет"
                hint="Появятся, когда сотрудники поработают в приложении."
              />
            ) : (
              <div className="scrollbar-thin h-full overflow-y-auto">
                <div className="flex flex-col divide-y divide-border">
                  {byDay.map(([day, list]) => {
                    const on = openDay === day;
                    return (
                      <div key={day} className="flex flex-col">
                        <button
                          type="button"
                          onClick={() => setOpenDay(on ? null : day)}
                          className="flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/50"
                        >
                          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-sm bg-secondary text-accent">
                            <Icon name="CalendarDays" size={16} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block font-head text-[0.9em] uppercase tracking-[0.04em]">
                              {ruDate(day)}
                            </span>
                            <span className="block text-[0.76em] text-muted-foreground">
                              сотрудников {list.length} · пробег{' '}
                              {list.reduce((s, d) => s + d.distanceKm, 0).toFixed(0)} км
                            </span>
                          </span>
                          <Icon
                            name={on ? 'ChevronUp' : 'ChevronDown'}
                            size={16}
                            className="flex-none text-muted-foreground"
                          />
                        </button>

                        {on && (
                          <div className="flex flex-col gap-1.5 px-3 pb-3">
                            {list.map((d) => (
                              <div
                                key={d.id}
                                className="flex flex-col gap-1.5 rounded-sm border border-border bg-card px-3 py-2.5"
                              >
                                <div className="flex flex-wrap items-center gap-2">
                                  <span
                                    className={cn(
                                      'flex h-8 w-8 flex-none items-center justify-center rounded-sm',
                                      d.role === 'driver'
                                        ? 'bg-blue-600/10 text-blue-600'
                                        : 'bg-accent/10 text-accent',
                                    )}
                                  >
                                    <Icon
                                      name={d.role === 'driver' ? 'Truck' : 'HardHat'}
                                      size={15}
                                    />
                                  </span>
                                  <span className="min-w-0 flex-1">
                                    <span className="block truncate text-[0.86em]">{d.fio}</span>
                                    <span className="block truncate text-[0.74em] text-muted-foreground">
                                      {ruTime(d.firstAt)}–{ruTime(d.lastAt)} · {d.points} точек
                                    </span>
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => showTrack(d)}
                                    className="flex items-center gap-1 rounded-sm border border-border px-2 py-1 text-[0.72em] uppercase tracking-[0.06em] text-muted-foreground transition-colors hover:border-accent hover:text-accent"
                                  >
                                    <Icon name="Map" size={12} />
                                    маршрут
                                  </button>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  <span className="rounded-sm border border-border px-2 py-0.5 text-[0.74em]">
                                    <Icon name="Route" size={11} className="mr-1 inline" />
                                    {d.distanceKm.toFixed(1)} км
                                  </span>
                                  <span className="rounded-sm border border-emerald-600 px-2 py-0.5 text-[0.74em] text-emerald-600">
                                    в движении {fmtMin(d.moveMin)}
                                  </span>
                                  <span className="rounded-sm border border-amber-500 px-2 py-0.5 text-[0.74em] text-amber-600">
                                    простой {fmtMin(d.idleMin)}
                                  </span>
                                </div>
                                {d.idles.length > 0 && (
                                  <div className="flex flex-col gap-0.5 rounded-sm border border-border bg-secondary/30 p-2">
                                    <span className="text-[0.72em] uppercase tracking-[0.08em] text-muted-foreground">
                                      Стоянки дольше 5 минут
                                    </span>
                                    {d.idles.slice(0, 8).map((s, i) => (
                                      <a
                                        key={i}
                                        href={`https://www.openstreetmap.org/?mlat=${s.lat}&mlon=${s.lng}#map=17/${s.lat}/${s.lng}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-[0.78em] transition-colors hover:text-accent"
                                      >
                                        {ruTime(s.from)}–{ruTime(s.to)} · {s.minutes} мин ·{' '}
                                        {s.lat.toFixed(4)}, {s.lng.toFixed(4)}
                                      </a>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Panel>
        </>
      )}

      {tab === 'month' && (
        <Panel
          title={`Сводная таблица · ${ymTitle(ym)}`}
          note={monthLoaded ? `собрано ${ruDate(monthLoaded.slice(0, 10))}` : 'не собрано'}
          className="min-h-0 flex-1"
          action={
            <div className="ml-auto flex items-center gap-1.5">
              <input
                type="month"
                value={ym}
                onChange={(e) => {
                  setYm(e.target.value);
                  loadMonth(e.target.value);
                }}
                className="rounded-sm border border-border bg-card px-2 py-1 text-[0.8em]"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={rebuild}
                disabled={busy}
                className="gap-1.5 rounded-sm"
              >
                <Icon name="RefreshCw" size={14} className={busy ? 'animate-spin' : ''} />
                Пересчитать
              </Button>
              <Button
                size="sm"
                onClick={() => csv(month, ym)}
                disabled={!month.length}
                className="gap-1.5 rounded-sm bg-accent font-head uppercase tracking-[0.06em] text-accent-foreground hover:bg-accent/90"
              >
                <Icon name="Download" size={14} />
                Excel
              </Button>
            </div>
          }
        >
          {!month.length ? (
            <Empty
              icon="Table"
              title="Свод пуст"
              hint="Создаётся автоматически в последний день месяца. Можно собрать вручную кнопкой «Пересчитать»."
            />
          ) : (
            <div className="scrollbar-thin h-full overflow-y-auto">
              <table className="w-full text-[0.84em]">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b border-border text-left text-[0.82em] uppercase tracking-[0.06em] text-muted-foreground">
                    <th className="px-4 py-2">Сотрудник</th>
                    <th className="px-2 py-2">Дней</th>
                    <th className="px-2 py-2">Пробег, км</th>
                    <th className="px-2 py-2">В движении</th>
                    <th className="px-2 py-2">Простой</th>
                  </tr>
                </thead>
                <tbody>
                  {month.map((r) => (
                    <tr key={r.userId} className="border-b border-border/60">
                      <td className="px-4 py-2">
                        <span className="block">{r.fio}</span>
                        <span className="block text-[0.82em] text-muted-foreground">
                          {ROLE_LABEL[r.role as keyof typeof ROLE_LABEL] ?? r.role}
                        </span>
                      </td>
                      <td className="px-2 py-2">{r.days}</td>
                      <td className="px-2 py-2 font-head">{r.km.toFixed(1)}</td>
                      <td className="px-2 py-2 text-emerald-600">{fmtMin(r.moveMin)}</td>
                      <td className="px-2 py-2 text-amber-600">{fmtMin(r.idleMin)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}
    </div>
  );
};

export default TrackerCabinet;
