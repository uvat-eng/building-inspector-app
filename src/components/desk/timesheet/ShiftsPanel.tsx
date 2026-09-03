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
import { ProjectObject } from '@/data/store';
import { fmtHours, shiftLabel, fmtDay, buildShifts } from '@/data/timesheet';

type Shift = ReturnType<typeof buildShifts>[number];

interface ShiftsPanelProps {
  shifts: Shift[];
  objects: ProjectObject[];
  onOpenForm: () => void;
  shiftForm: boolean;
  setShiftForm: (v: boolean) => void;
  shiftFrom: string;
  setShiftFrom: (v: string) => void;
  shiftTo: string;
  setShiftTo: (v: string) => void;
  shiftObj: string;
  setShiftObj: (v: string) => void;
  shiftHours: { from: string; to: string };
  setShiftHours: React.Dispatch<React.SetStateAction<{ from: string; to: string }>>;
  saveShift: () => void;
}

const ShiftsPanel = ({
  shifts,
  objects,
  onOpenForm,
  shiftForm,
  setShiftForm,
  shiftFrom,
  setShiftFrom,
  shiftTo,
  setShiftTo,
  shiftObj,
  setShiftObj,
  shiftHours,
  setShiftHours,
  saveShift,
}: ShiftsPanelProps) => (
  <>
    <Panel
      title="Учёт по вахтам"
      note={`${shifts.length}`}
      action={
        <button
          type="button"
          onClick={onOpenForm}
          className="ml-3 flex flex-none items-center gap-1.5 rounded-sm bg-accent px-2.5 py-1 text-[0.76em] uppercase tracking-[0.06em] text-accent-foreground transition-colors hover:bg-accent/90"
        >
          <Icon name="CalendarPlus" size={13} />
          Записать вахту
        </button>
      }
    >
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
                {s.moDays ? ` · МО ${s.moDays} дн. с ${fmtDay(s.moStart)}` : ''}
                {s.objects.length ? ` · ${s.objects.join(', ')}` : ''}
              </span>
            </span>
          </div>
        ))
      )}
    </Panel>

    <Dialog open={shiftForm} onOpenChange={setShiftForm}>
      <DialogContent className="max-w-md rounded-sm border-t-2 border-t-accent">
        <DialogHeader>
          <DialogTitle className="font-head text-[1.25em] uppercase tracking-[0.03em]">
            Записать вахту
          </DialogTitle>
          <DialogDescription className="text-[0.85em]">
            Укажите период — смены проставятся в табеле автоматически.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-[0.78em] uppercase tracking-[0.08em]">Начало</Label>
              <Input
                type="date"
                value={shiftFrom}
                onChange={(e) => setShiftFrom(e.target.value)}
                className="rounded-sm"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[0.78em] uppercase tracking-[0.08em]">Окончание</Label>
              <Input
                type="date"
                value={shiftTo}
                onChange={(e) => setShiftTo(e.target.value)}
                className="rounded-sm"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-[0.78em] uppercase tracking-[0.08em]">Объект</Label>
            {objects.length === 0 ? (
              <p className="text-[0.82em] text-muted-foreground">
                Объекты не назначены — обратитесь к руководителю проекта.
              </p>
            ) : (
              <div className="max-h-40 overflow-y-auto rounded-sm border border-border">
                {objects.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => setShiftObj(o.id)}
                    className={cn(
                      'flex w-full items-center gap-2 border-b border-border px-3 py-2 text-left text-[0.85em] last:border-b-0',
                      shiftObj === o.id ? 'bg-accent text-accent-foreground' : 'hover:bg-secondary',
                    )}
                  >
                    <Icon
                      name={shiftObj === o.id ? 'CircleCheck' : 'Building2'}
                      size={15}
                      className="flex-none"
                    />
                    <span className="truncate">{o.title}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-[0.78em] uppercase tracking-[0.08em]">Смена с</Label>
              <Input
                type="time"
                value={shiftHours.from}
                onChange={(e) => setShiftHours((h) => ({ ...h, from: e.target.value }))}
                className="rounded-sm"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[0.78em] uppercase tracking-[0.08em]">по</Label>
              <Input
                type="time"
                value={shiftHours.to}
                onChange={(e) => setShiftHours((h) => ({ ...h, to: e.target.value }))}
                className="rounded-sm"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 rounded-sm"
              onClick={() => setShiftForm(false)}
            >
              Отмена
            </Button>
            <Button
              onClick={saveShift}
              className="flex-1 gap-2 rounded-sm bg-accent font-head uppercase tracking-[0.06em] text-accent-foreground hover:bg-accent/90"
            >
              <Icon name="Check" size={16} />
              Записать
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  </>
);

export default ShiftsPanel;
