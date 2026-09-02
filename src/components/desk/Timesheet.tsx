import { useMemo, useState } from 'react';
import Panel from '@/components/desk/Panel';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useObjects } from '@/data/store';
import { useProfile } from '@/data/profile';
import ShareMenu from '@/components/desk/ShareMenu';
import {
  useTimesheet,
  dayKey,
  MONTHS,
  WEEKDAYS,
  monthEntries,
  TimeEntry,
  dayHours,
  entryHours,
  fmtHours,
  SHIFTS,
  shiftOf,
  MO_ENTRY,
  isMO,
  buildShifts,
  shiftLabel,
  fmtDay,
} from '@/data/timesheet';

const today = new Date();

const blank: TimeEntry = { objectId: '', objectTitle: '', from: '08:00', to: '20:00' };

const Timesheet = () => {
  const { profile } = useProfile();
  const { list: objects } = useObjects();
  const { sheet, setDay, loading, synced } = useTimesheet();
  const { toast } = useToast();

  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [pick, setPick] = useState<number | null>(null);
  const [report, setReport] = useState(false);
  const [share, setShare] = useState(false);

  const [rows, setRows] = useState<TimeEntry[]>([]);
  const [objOpen, setObjOpen] = useState<number | null>(null);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstShift = (new Date(year, month, 1).getDay() + 6) % 7;

  const entries = useMemo(() => monthEntries(sheet, year, month), [sheet, year, month]);
  const shifts = useMemo(() => buildShifts(sheet), [sheet]);
  const workEntries = useMemo(() => entries.filter(([, l]) => !isMO(l)), [entries]);
  const moDays = entries.length - workEntries.length;
  const totalHours = workEntries.reduce((s, [, list]) => s + dayHours(list), 0);
  const nightDays = entries.filter(([, list]) => shiftOf(list) === 'night').length;
  const rowsHours = dayHours(rows);

  const shareDoc = useMemo(() => {
    const period = `${MONTHS[month]} ${year}`;
    const head = [
      `ТАБЕЛЬ УЧЁТА РАБОЧЕГО ВРЕМЕНИ · ${period}`,
      `Инспектор: ${profile.fio || '—'}`,
      `Проект: ${profile.group || '—'}`,
      `Организация: ${profile.org || '—'}`,
      '',
    ];
    const lines = entries.flatMap(([k, list]) =>
      isMO(list)
        ? [`${k.split('-').reverse().join('.')} · МО · межвахтовый отдых`]
        : list.map(
            (e) =>
              `${k.split('-').reverse().join('.')} · ${
                shiftOf(list) === 'night' ? 'ночная' : 'дневная'
              } · ${e.objectTitle} · ${e.from}–${e.to} · ${fmtHours(entryHours(e))} ч`,
          ),
    );
    const total = `\nИтого: ${workEntries.length} смен (${nightDays} ноч. / ${
      workEntries.length - nightDays
    } дн.), ${fmtHours(totalHours)} ч${moDays ? `\nМежвахтовый отдых: ${moDays} дн.` : ''}`;

    const csvRows = [
      ['Дата', 'Смена', 'Объект', 'Начало', 'Окончание', 'Часы'],
      ...entries.flatMap(([k, list]) =>
        isMO(list)
          ? [[k.split('-').reverse().join('.'), 'МО', 'Межвахтовый отдых', '', '', '0']]
          : list.map((e) => [
              k.split('-').reverse().join('.'),
              shiftOf(list) === 'night' ? 'Ночная' : 'Дневная',
              e.objectTitle,
              e.from,
              e.to,
              fmtHours(entryHours(e)),
            ]),
      ),
      ['Итого', '', '', '', '', fmtHours(totalHours)],
    ];

    return {
      fileName: `Табель_${profile.fio.split(' ')[0] || 'инспектор'}_${MONTHS[month]}_${year}.csv`,
      subject: `Табель учёта рабочего времени · ${period} · ${profile.fio || 'инспектор'}`,
      text: [...head, ...lines, total].join('\n'),
      csv: csvRows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n'),
    };
  }, [entries, workEntries, moDays, month, year, profile, totalHours, nightDays]);

  const shift = (delta: number) => {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };

  const openDay = (d: number) => {
    const cur = sheet[dayKey(year, month, d)] ?? [];
    setRows(cur.length ? [...cur] : [{ ...blank }]);
    setObjOpen(cur.length ? null : 0);
    setPick(d);
  };

  const patch = (i: number, p: Partial<TimeEntry>) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...p } : r)));

  const addRow = () =>
    setRows((prev) => {
      const last = prev[prev.length - 1];
      const end = shiftOf(prev) === 'night' ? '08:00' : '20:00';
      return [...prev, { objectId: '', objectTitle: '', from: last?.to || '08:00', to: end }];
    });

  const removeRow = (i: number) => setRows((prev) => prev.filter((_, idx) => idx !== i));

  const shift0 = shiftOf(rows);

  const applyShift = (from: string, to: string) =>
    setRows((prev) =>
      prev.length <= 1 ? [{ ...(prev[0] ?? blank), from, to }] : [{ ...prev[0], from }, ...prev.slice(1, -1), { ...prev[prev.length - 1], to }],
    );

  const saveDay = () => {
    if (pick === null) return;
    const clean = rows.filter((r) => r.objectId);
    if (clean.length === 0) {
      toast({ title: 'Выберите объект хотя бы в одной строке', variant: 'destructive' });
      return;
    }
    setDay(dayKey(year, month, pick), clean);
    setPick(null);
  };

  const markMO = () => {
    if (pick === null) return;
    setDay(dayKey(year, month, pick), [{ ...MO_ENTRY }]);
    setPick(null);
    toast({
      title: 'Отмечен межвахтовый отдых',
      description: 'Отмечайте МО каждый день до возвращения на вахту.',
    });
  };

  const clearDay = () => {
    if (pick === null) return;
    setDay(dayKey(year, month, pick), null);
    setPick(null);
  };

  return (
    <>
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
                    isMO(list)
                      ? 'border-warning bg-warning/10 hover:bg-warning/20'
                      : list?.length
                        ? 'border-accent bg-accent/10 hover:bg-accent/20'
                        : 'border-border hover:bg-secondary/60',
                    isToday && 'ring-1 ring-foreground',
                  )}
                >
                  <span className="flex items-center gap-1">
                    <span className="font-head text-[0.95em] leading-none">{d}</span>
                    {isMO(list) ? (
                      <Icon name="Home" size={11} className="text-warning" />
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
                  {isMO(list) ? (
                    <span className="mt-auto font-head text-[0.72em] uppercase text-warning">
                      МО
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
                    <Icon
                      name="Plus"
                      size={12}
                      className="mt-auto self-end text-muted-foreground/40"
                    />
                  )}
                </button>
              );
            })}
          </div>

          <Button
            onClick={() => setReport(true)}
            className="mt-3 w-full gap-2 rounded-sm bg-accent font-head uppercase tracking-[0.06em] text-accent-foreground hover:bg-accent/90"
          >
            <Icon name="FileText" size={16} />
            Сформировать табель
          </Button>
        </div>
      </Panel>

      <Panel title="Учёт по вахтам" note={`${shifts.length}`}>
        {shifts.length === 0 ? (
          <p className="p-4 text-[0.85em] text-muted-foreground">
            Отметьте рабочие дни — вахта соберётся сама, даже если переходит через месяц.
          </p>
        ) : (
          shifts.slice(0, 6).map((s) => (
            <div
              key={s.start}
              className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0"
            >
              <span
                className={cn(
                  'flex h-9 w-9 flex-none items-center justify-center rounded-sm',
                  s.open ? 'bg-accent text-accent-foreground' : 'bg-secondary text-muted-foreground',
                )}
              >
                <Icon name={s.open ? 'PlayCircle' : 'CheckCircle2'} size={17} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-head text-[0.95em] uppercase tracking-[0.02em]">
                  Вахта {shiftLabel(s)}
                  {s.open && <span className="ml-2 text-[0.8em] text-accent">идёт</span>}
                </span>
                <span className="block truncate text-[0.76em] text-muted-foreground">
                  {s.workDays} смен · {fmtHours(s.hours)} ч
                  {s.moDays
                    ? ` · МО ${s.moDays} дн. с ${fmtDay(s.moStart)}`
                    : ''}
                  {s.objects.length ? ` · ${s.objects.join(', ')}` : ''}
                </span>
              </span>
            </div>
          ))
        )}
      </Panel>

      <Dialog open={pick !== null} onOpenChange={(v) => !v && setPick(null)}>
        <DialogContent
          className="max-w-lg rounded-sm"
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="font-head text-[1.25em] uppercase tracking-[0.03em]">
              {pick} {MONTHS[month].toLowerCase()} {year}
            </DialogTitle>
            <DialogDescription className="text-[0.85em]">
              Смена 12 часов. Несколько объектов — разбейте смену по времени. Итого{' '}
              <b className="text-accent">{fmtHours(rowsHours)} ч</b>.
            </DialogDescription>
          </DialogHeader>

          {objects.length === 0 ? (
            <p className="rounded-sm bg-secondary/60 p-3 text-[0.85em] text-muted-foreground">
              Объектов пока нет. Добавьте объект в разделе «Объекты» — он появится в этом списке.
            </p>
          ) : (
            <>
              <div className="flex gap-2">
                {SHIFTS.map((s) => {
                  const on = shift0 === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => applyShift(s.from, s.to)}
                      className={cn(
                        'flex flex-1 items-center justify-center gap-2 rounded-sm border px-2 py-2 text-[0.8em] uppercase tracking-[0.06em] transition-colors',
                        on
                          ? 'border-accent bg-accent text-accent-foreground'
                          : 'border-input hover:bg-secondary',
                      )}
                    >
                      <Icon name={s.id === 'day' ? 'Sun' : 'Moon'} size={14} />
                      {s.label}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={markMO}
                className="flex items-center justify-center gap-2 rounded-sm border border-warning px-2 py-2 text-[0.8em] uppercase tracking-[0.06em] text-warning transition-colors hover:bg-warning hover:text-background"
              >
                <Icon name="Home" size={14} />
                МО — межвахтовый отдых
              </button>

              <div className="scrollbar-thin max-h-[52vh] space-y-2.5 overflow-y-auto pr-1">
                {rows.map((r, i) => (
                  <div key={i} className="rounded-sm border border-border p-2.5">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 flex-none items-center justify-center rounded-sm bg-secondary font-head text-[0.75em]">
                        {i + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => setObjOpen(objOpen === i ? null : i)}
                        className="flex min-w-0 flex-1 items-center gap-2 rounded-sm border border-input px-2.5 py-1.5 text-left text-[0.85em]"
                      >
                        <span
                          className={cn(
                            'min-w-0 flex-1 truncate',
                            !r.objectId && 'text-muted-foreground',
                          )}
                        >
                          {r.objectTitle || 'Выберите объект'}
                        </span>
                        <Icon
                          name="ChevronDown"
                          size={14}
                          className={cn('flex-none transition-transform', objOpen === i && 'rotate-180')}
                        />
                      </button>
                      {rows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeRow(i)}
                          className="flex h-7 w-7 flex-none items-center justify-center rounded-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
                        >
                          <Icon name="X" size={15} />
                        </button>
                      )}
                    </div>

                    {objOpen === i && (
                      <div className="scrollbar-thin mt-2 max-h-[160px] overflow-y-auto rounded-sm border border-input">
                        {objects.map((o) => (
                          <button
                            key={o.id}
                            type="button"
                            onClick={() => {
                              patch(i, { objectId: o.id, objectTitle: o.title });
                              setObjOpen(null);
                            }}
                            className={cn(
                              'flex w-full items-center gap-2.5 border-b border-border px-3 py-2 text-left text-[0.85em] last:border-b-0',
                              r.objectId === o.id ? 'bg-secondary' : 'hover:bg-secondary/60',
                            )}
                          >
                            <span
                              className={cn(
                                'h-3 w-3 flex-none rounded-full border',
                                r.objectId === o.id ? 'border-accent bg-accent' : 'border-input',
                              )}
                            />
                            <span className="min-w-0">
                              <span className="block truncate">{o.title}</span>
                              <span className="block truncate text-[0.85em] text-muted-foreground">
                                {o.regionName}
                              </span>
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="mt-2 flex items-end gap-2">
                      <div className="flex-1 space-y-1">
                        <Label className="text-[0.68em] uppercase tracking-[0.1em] text-muted-foreground">
                          С
                        </Label>
                        <Input
                          type="time"
                          value={r.from}
                          onChange={(e) => patch(i, { from: e.target.value })}
                          onWheel={(e) => e.currentTarget.blur()}
                          className="h-9 rounded-sm"
                        />
                      </div>
                      <div className="flex-1 space-y-1">
                        <Label className="text-[0.68em] uppercase tracking-[0.1em] text-muted-foreground">
                          До
                        </Label>
                        <Input
                          type="time"
                          value={r.to}
                          onChange={(e) => patch(i, { to: e.target.value })}
                          onWheel={(e) => e.currentTarget.blur()}
                          className="h-9 rounded-sm"
                        />
                      </div>
                      <span className="pb-2 font-head text-[0.85em] text-accent">
                        {fmtHours(entryHours(r))} ч
                      </span>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addRow}
                  className="flex w-full items-center justify-center gap-2 rounded-sm border border-dashed border-input py-2 text-[0.85em] text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                >
                  <Icon name="Plus" size={15} />
                  Добавить объект
                </button>
              </div>

              <div className="flex gap-2">
                {sheet[dayKey(year, month, pick ?? 1)] && (
                  <Button variant="outline" className="rounded-sm" onClick={clearDay}>
                    <Icon name="Trash2" size={15} />
                  </Button>
                )}
                <Button
                  onClick={saveDay}
                  className="flex-1 rounded-sm bg-accent font-head uppercase tracking-[0.06em] text-accent-foreground hover:bg-accent/90"
                >
                  Сохранить
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={report} onOpenChange={setReport}>
        <DialogContent className="max-w-2xl rounded-sm">
          <DialogHeader>
            <DialogTitle className="font-head text-[1.25em] uppercase tracking-[0.03em]">
              Табель учёта рабочего времени
            </DialogTitle>
            <DialogDescription className="text-[0.85em]">
              {MONTHS[month]} {year} · {profile.org}
            </DialogDescription>
          </DialogHeader>

          <div id="timesheet-print" className="scrollbar-thin max-h-[60vh] overflow-y-auto">
            <div className="mb-3 space-y-0.5 text-[0.9em]">
              <p>
                <b>Инспектор:</b> {profile.fio || '—'}
              </p>
              <p>
                <b>Проект:</b> {profile.group || '—'}
              </p>
              <p>
                <b>Период:</b> {MONTHS[month]} {year}
              </p>
            </div>

            {entries.length === 0 ? (
              <p className="rounded-sm bg-secondary/60 p-3 text-[0.85em] text-muted-foreground">
                За этот месяц отметок нет.
              </p>
            ) : (
              <table className="w-full border-collapse text-[0.85em]">
                <thead>
                  <tr className="bg-secondary text-left uppercase tracking-[0.08em]">
                    <th className="border border-border px-2 py-1.5">Дата</th>
                    <th className="border border-border px-2 py-1.5">Смена</th>
                    <th className="border border-border px-2 py-1.5">Объект</th>
                    <th className="border border-border px-2 py-1.5">Период</th>
                    <th className="border border-border px-2 py-1.5 text-right">Часы</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map(([k, list]) =>
                    list.map((e, i) => (
                      <tr key={`${k}-${i}`}>
                        {i === 0 && (
                          <>
                            <td
                              className="border border-border px-2 py-1.5 align-top"
                              rowSpan={list.length}
                            >
                              {k.split('-').reverse().join('.')}
                            </td>
                            <td
                              className="border border-border px-2 py-1.5 align-top"
                              rowSpan={list.length}
                            >
                              {shiftOf(list) === 'night' ? 'Ночная' : 'Дневная'}
                            </td>
                          </>
                        )}
                        <td className="border border-border px-2 py-1.5">{e.objectTitle}</td>
                        <td className="border border-border px-2 py-1.5">
                          {e.from}–{e.to}
                        </td>
                        <td className="border border-border px-2 py-1.5 text-right">
                          {fmtHours(entryHours(e))}
                        </td>
                      </tr>
                    )),
                  )}
                  <tr className="font-bold">
                    <td className="border border-border px-2 py-1.5" colSpan={4}>
                      Итого: {entries.length} смен ({nightDays} ноч. / {entries.length - nightDays}{' '}
                      дн.)
                    </td>
                    <td className="border border-border px-2 py-1.5 text-right">
                      {fmtHours(totalHours)}
                    </td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => window.print()}
              variant="outline"
              className="flex-1 gap-2 rounded-sm font-head uppercase tracking-[0.06em]"
            >
              <Icon name="Printer" size={16} />
              Печать / PDF
            </Button>
            <Button
              onClick={() => setShare(true)}
              disabled={entries.length === 0}
              className="flex-1 gap-2 rounded-sm bg-accent font-head uppercase tracking-[0.06em] text-accent-foreground hover:bg-accent/90"
            >
              <Icon name="Share2" size={16} />
              Отправить
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ShareMenu open={share} onOpenChange={setShare} doc={shareDoc} />
    </>
  );
};

export default Timesheet;