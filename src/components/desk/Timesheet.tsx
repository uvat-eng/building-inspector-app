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
import { useTimesheet, dayKey, MONTHS, WEEKDAYS, monthEntries, TimeEntry } from '@/data/timesheet';

const today = new Date();

const Timesheet = () => {
  const { profile } = useProfile();
  const { list: objects } = useObjects();
  const { sheet, setDay } = useTimesheet();
  const { toast } = useToast();

  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [pick, setPick] = useState<number | null>(null);
  const [report, setReport] = useState(false);

  const [objId, setObjId] = useState('');
  const [hours, setHours] = useState('8');

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstShift = (new Date(year, month, 1).getDay() + 6) % 7;

  const entries = useMemo(() => monthEntries(sheet, year, month), [sheet, year, month]);
  const totalHours = entries.reduce((s, [, e]) => s + e.hours, 0);

  const shift = (delta: number) => {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };

  const openDay = (d: number) => {
    const cur = sheet[dayKey(year, month, d)];
    setObjId(cur?.objectId ?? '');
    setHours(cur ? String(cur.hours) : '8');
    setPick(d);
  };

  const saveDay = () => {
    if (pick === null) return;
    const obj = objects.find((o) => o.id === objId);
    if (!obj) {
      toast({ title: 'Выберите объект', variant: 'destructive' });
      return;
    }
    const h = Number(hours.replace(',', '.'));
    if (!h || h <= 0 || h > 24) {
      toast({ title: 'Часы: от 1 до 24', variant: 'destructive' });
      return;
    }
    const entry: TimeEntry = { objectId: obj.id, objectTitle: obj.title, hours: h };
    setDay(dayKey(year, month, pick), entry);
    setPick(null);
  };

  const clearDay = () => {
    if (pick === null) return;
    setDay(dayKey(year, month, pick), null);
    setPick(null);
  };

  const printReport = () => window.print();

  return (
    <>
      <Panel
        title="Табель учёта рабочего времени"
        note={`${entries.length} дн. · ${totalHours} ч`}
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
              const e = sheet[dayKey(year, month, d)];
              const isToday =
                d === today.getDate() &&
                month === today.getMonth() &&
                year === today.getFullYear();
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => openDay(d)}
                  className={cn(
                    'flex min-h-[58px] flex-col rounded-sm border p-1.5 text-left transition-colors',
                    e
                      ? 'border-accent bg-accent/10 hover:bg-accent/20'
                      : 'border-border hover:bg-secondary/60',
                    isToday && 'ring-1 ring-foreground',
                  )}
                >
                  <span className="font-head text-[0.95em] leading-none">{d}</span>
                  {e ? (
                    <>
                      <span className="mt-1 line-clamp-2 text-[0.68em] leading-tight text-muted-foreground">
                        {e.objectTitle}
                      </span>
                      <span className="mt-auto font-head text-[0.75em] text-accent">{e.hours} ч</span>
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

      <Dialog open={pick !== null} onOpenChange={(v) => !v && setPick(null)}>
        <DialogContent className="max-w-md rounded-sm">
          <DialogHeader>
            <DialogTitle className="font-head text-[1.25em] uppercase tracking-[0.03em]">
              {pick} {MONTHS[month].toLowerCase()} {year}
            </DialogTitle>
            <DialogDescription className="text-[0.85em]">
              Выберите объект и укажите отработанные часы.
            </DialogDescription>
          </DialogHeader>

          {objects.length === 0 ? (
            <p className="rounded-sm bg-secondary/60 p-3 text-[0.85em] text-muted-foreground">
              Объектов пока нет. Добавьте объект в разделе «Объекты» — он появится в этом списке.
            </p>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
                  Объект
                </Label>
                <div className="scrollbar-thin max-h-[190px] overflow-y-auto rounded-sm border border-input">
                  {objects.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => setObjId(o.id)}
                      className={cn(
                        'flex w-full items-center gap-2.5 border-b border-border px-3 py-2 text-left text-[0.85em] last:border-b-0',
                        objId === o.id ? 'bg-secondary' : 'hover:bg-secondary/60',
                      )}
                    >
                      <span
                        className={cn(
                          'h-3 w-3 flex-none rounded-full border',
                          objId === o.id ? 'border-accent bg-accent' : 'border-input',
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
              </div>

              <div className="space-y-1.5">
                <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
                  Отработано часов
                </Label>
                <Input
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  inputMode="decimal"
                  className="rounded-sm"
                />
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
            </div>
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
                    <th className="border border-border px-2 py-1.5">Объект</th>
                    <th className="border border-border px-2 py-1.5 text-right">Часы</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map(([k, e]) => (
                    <tr key={k}>
                      <td className="border border-border px-2 py-1.5">
                        {k.split('-').reverse().join('.')}
                      </td>
                      <td className="border border-border px-2 py-1.5">{e.objectTitle}</td>
                      <td className="border border-border px-2 py-1.5 text-right">{e.hours}</td>
                    </tr>
                  ))}
                  <tr className="font-bold">
                    <td className="border border-border px-2 py-1.5" colSpan={2}>
                      Итого: {entries.length} дн.
                    </td>
                    <td className="border border-border px-2 py-1.5 text-right">{totalHours}</td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>

          <Button
            onClick={printReport}
            className="gap-2 rounded-sm bg-accent font-head uppercase tracking-[0.06em] text-accent-foreground hover:bg-accent/90"
          >
            <Icon name="Printer" size={16} />
            Печать / PDF
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Timesheet;
