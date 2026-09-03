import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Profile } from '@/data/profile';
import { MONTHS, TimeEntry, entryHours, fmtHours, shiftOf } from '@/data/timesheet';

interface ReportDialogProps {
  report: boolean;
  setReport: (v: boolean) => void;
  month: number;
  year: number;
  profile: Profile;
  entries: [string, TimeEntry[]][];
  nightDays: number;
  totalHours: number;
  onShare: () => void;
}

const ReportDialog = ({
  report,
  setReport,
  month,
  year,
  profile,
  entries,
  nightDays,
  totalHours,
  onShare,
}: ReportDialogProps) => (
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
                  Итого: {entries.length} смен ({nightDays} ноч. / {entries.length - nightDays} дн.)
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
          onClick={onShare}
          disabled={entries.length === 0}
          className="flex-1 gap-2 rounded-sm bg-accent font-head uppercase tracking-[0.06em] text-accent-foreground hover:bg-accent/90"
        >
          <Icon name="Share2" size={16} />
          Отправить
        </Button>
      </div>
    </DialogContent>
  </Dialog>
);

export default ReportDialog;
