import { useMemo, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useObjects } from '@/data/store';
import { useProfile } from '@/data/profile';
import ShareMenu from '@/components/desk/ShareMenu';
import ShiftsPanel from '@/components/desk/timesheet/ShiftsPanel';
import CalendarPanel from '@/components/desk/timesheet/CalendarPanel';
import DayDialog from '@/components/desk/timesheet/DayDialog';
import ReportDialog from '@/components/desk/timesheet/ReportDialog';
import {
  useTimesheet,
  dayKey,
  MONTHS,
  monthEntries,
  TimeEntry,
  dayHours,
  entryHours,
  fmtHours,
  shiftOf,
  MARKS,
  MARK_BY_ID,
  markEntry,
  isMark,
  isMO,
  codeOf,
  buildShifts,
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
  const [shiftForm, setShiftForm] = useState(false);
  const [shiftFrom, setShiftFrom] = useState('');
  const [shiftTo, setShiftTo] = useState('');
  const [shiftObj, setShiftObj] = useState('');
  const [shiftHours, setShiftHours] = useState({ from: '08:00', to: '20:00' });
  const [objOpen, setObjOpen] = useState<number | null>(null);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstShift = (new Date(year, month, 1).getDay() + 6) % 7;

  const entries = useMemo(() => monthEntries(sheet, year, month), [sheet, year, month]);
  const shifts = useMemo(() => buildShifts(sheet), [sheet]);
  const workEntries = useMemo(() => entries.filter(([, l]) => !isMark(l)), [entries]);
  const moDays = entries.filter(([, l]) => isMO(l)).length;
  const totalHours = workEntries.reduce((s, [, list]) => s + dayHours(list), 0);
  const nightDays = entries.filter(([, list]) => shiftOf(list) === 'night').length;
  const rowsHours = dayHours(rows);

  const shareDoc = useMemo(() => {
    const period = `${MONTHS[month]} ${year}`;
    const mainObj = objects.find((o) => o.id === workEntries[0]?.[1]?.[0]?.objectId);
    const objNames = [
      ...new Set(workEntries.flatMap(([, l]) => l.map((e) => e.objectTitle)).filter(Boolean)),
    ];

    const head = [
      `ТАБЕЛЬ УЧЁТА РАБОЧЕГО ВРЕМЕНИ · ${period}`,
      `Объект: ${objNames.join(', ') || '—'}`,
      `Заказчик: ${mainObj?.customer || '—'}`,
      `Инспектор: ${profile.fio || '—'}`,
      '',
    ];

    const counts: Record<string, number> = {};
    entries.forEach(([, l]) => {
      const c = codeOf(l);
      if (c) counts[c] = (counts[c] ?? 0) + 1;
    });

    const days = Array.from({ length: daysInMonth }).map((_, i) => {
      const list = sheet[dayKey(year, month, i + 1)];
      return codeOf(list) || '';
    });

    const lines = entries.map(([k, list]) => {
      const date = k.split('-').reverse().join('.');
      if (isMark(list)) return `${date} · ${codeOf(list)} · ${list[0].objectTitle}`;
      return `${date} · Я · ${shiftOf(list) === 'night' ? 'ночная' : 'дневная'} · ${list
        .map((e) => `${e.objectTitle} ${e.from}–${e.to}`)
        .join('; ')} · ${fmtHours(dayHours(list))} ч`;
    });

    const legend = MARKS.map((m) => `${m.code} — ${m.label}: ${counts[m.code] ?? 0}`);
    const total = [
      '',
      `Явок (Я): ${workEntries.length}, из них ночных ${nightDays}`,
      `Отработано часов: ${fmtHours(totalHours)}`,
      ...legend,
    ].join('\n');

    const csvRows = [
      ['Ф.И.О.', 'Должность', ...Array.from({ length: daysInMonth }, (_, i) => String(i + 1)),
        'Я', 'Б', 'ДО', 'ОТ', 'НН', 'В', 'У', 'Часы'],
      [
        profile.fio || '—',
        'Инспектор строительного контроля',
        ...days,
        String(workEntries.length),
        String(counts['Б'] ?? 0),
        String(counts['ДО'] ?? 0),
        String(counts['ОТ'] ?? 0),
        String(counts['НН'] ?? 0),
        String(counts['В'] ?? 0),
        String(counts['У'] ?? 0),
        fmtHours(totalHours),
      ],
      [],
      ['Объект', objNames.join(', ') || '—'],
      ['Заказчик', mainObj?.customer || '—'],
      ['Период', period],
      [],
      ['Дата', 'Код', 'Объект', 'Начало', 'Окончание', 'Часы'],
      ...entries.flatMap(([k, list]) =>
        isMark(list)
          ? [[k.split('-').reverse().join('.'), codeOf(list), list[0].objectTitle, '', '', '0']]
          : list.map((e) => [
              k.split('-').reverse().join('.'),
              'Я',
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
  }, [
    entries,
    workEntries,
    month,
    year,
    profile,
    totalHours,
    nightDays,
    objects,
    sheet,
    daysInMonth,
  ]);

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

  const setMark = (id: (typeof MARKS)[number]['id']) => {
    if (pick === null) return;
    setDay(dayKey(year, month, pick), [markEntry(id)]);
    setPick(null);
    toast({
      title: `Отметка «${MARK_BY_ID[id].code}» проставлена`,
      description: MARK_BY_ID[id].label,
    });
  };

  const saveShift = () => {
    if (!shiftFrom || !shiftTo) {
      toast({ title: 'Укажите начало и конец вахты', variant: 'destructive' });
      return;
    }
    if (shiftTo < shiftFrom) {
      toast({ title: 'Дата окончания раньше начала', variant: 'destructive' });
      return;
    }
    const obj = objects.find((o) => o.id === shiftObj);
    if (!obj) {
      toast({ title: 'Выберите объект', variant: 'destructive' });
      return;
    }
    const from = new Date(shiftFrom);
    const to = new Date(shiftTo);
    let n = 0;
    for (const d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
      const key = dayKey(d.getFullYear(), d.getMonth(), d.getDate());
      setDay(key, [
        { objectId: obj.id, objectTitle: obj.title, from: shiftHours.from, to: shiftHours.to },
      ]);
      n += 1;
    }
    setShiftForm(false);
    setYear(from.getFullYear());
    setMonth(from.getMonth());
    toast({ title: 'Вахта записана', description: `${n} смен · ${obj.title}` });
  };

  const clearDay = () => {
    if (pick === null) return;
    setDay(dayKey(year, month, pick), null);
    setPick(null);
  };

  return (
    <>
      <ShiftsPanel
        shifts={shifts}
        objects={objects}
        onOpenForm={() => {
          const last = shifts[0];
          setShiftFrom(last?.end || new Date().toISOString().slice(0, 10));
          setShiftTo('');
          setShiftObj(objects[0]?.id ?? '');
          setShiftForm(true);
        }}
        shiftForm={shiftForm}
        setShiftForm={setShiftForm}
        shiftFrom={shiftFrom}
        setShiftFrom={setShiftFrom}
        shiftTo={shiftTo}
        setShiftTo={setShiftTo}
        shiftObj={shiftObj}
        setShiftObj={setShiftObj}
        shiftHours={shiftHours}
        setShiftHours={setShiftHours}
        saveShift={saveShift}
      />

      <CalendarPanel
        sheet={sheet}
        year={year}
        month={month}
        daysInMonth={daysInMonth}
        firstShift={firstShift}
        entries={entries}
        workEntries={workEntries}
        totalHours={totalHours}
        moDays={moDays}
        loading={loading}
        synced={synced}
        shift={shift}
        openDay={openDay}
        onReport={() => setReport(true)}
      />

      <DayDialog
        pick={pick}
        setPick={setPick}
        year={year}
        month={month}
        sheet={sheet}
        objects={objects}
        rows={rows}
        rowsHours={rowsHours}
        shift0={shift0}
        objOpen={objOpen}
        setObjOpen={setObjOpen}
        applyShift={applyShift}
        setMark={setMark}
        patch={patch}
        addRow={addRow}
        removeRow={removeRow}
        saveDay={saveDay}
        clearDay={clearDay}
      />

      <ReportDialog
        report={report}
        setReport={setReport}
        month={month}
        year={year}
        profile={profile}
        entries={entries}
        nightDays={nightDays}
        totalHours={totalHours}
        onShare={() => setShare(true)}
      />

      <ShareMenu open={share} onOpenChange={setShare} doc={shareDoc} />
    </>
  );
};

export default Timesheet;
