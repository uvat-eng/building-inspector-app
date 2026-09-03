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
import { ProjectObject } from '@/data/store';
import {
  dayKey,
  MONTHS,
  TimeEntry,
  entryHours,
  fmtHours,
  SHIFTS,
  MARKS,
} from '@/data/timesheet';

interface DayDialogProps {
  pick: number | null;
  setPick: (v: number | null) => void;
  year: number;
  month: number;
  sheet: Record<string, TimeEntry[]>;
  objects: ProjectObject[];
  rows: TimeEntry[];
  rowsHours: number;
  shift0: string | null;
  objOpen: number | null;
  setObjOpen: (v: number | null) => void;
  applyShift: (from: string, to: string) => void;
  setMark: (id: (typeof MARKS)[number]['id']) => void;
  patch: (i: number, p: Partial<TimeEntry>) => void;
  addRow: () => void;
  removeRow: (i: number) => void;
  saveDay: () => void;
  clearDay: () => void;
}

const DayDialog = ({
  pick,
  setPick,
  year,
  month,
  sheet,
  objects,
  rows,
  rowsHours,
  shift0,
  objOpen,
  setObjOpen,
  applyShift,
  setMark,
  patch,
  addRow,
  removeRow,
  saveDay,
  clearDay,
}: DayDialogProps) => (
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

          <div className="grid grid-cols-3 gap-1.5">
            {MARKS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMark(m.id)}
                className="flex items-center gap-1.5 rounded-sm border border-input px-2 py-1.5 text-left text-[0.74em] transition-colors hover:border-warning hover:bg-warning/10"
              >
                <span className="flex h-6 w-6 flex-none items-center justify-center rounded-sm bg-secondary font-head text-[0.9em]">
                  {m.code}
                </span>
                <span className="min-w-0 truncate">{m.label}</span>
              </button>
            ))}
          </div>

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
                      className={cn('min-w-0 flex-1 truncate', !r.objectId && 'text-muted-foreground')}
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
);

export default DayDialog;