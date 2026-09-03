import { useEffect, useState } from 'react';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  DefectRow,
  CATEGORIES,
  FIX_STATUSES,
  RESPONSIBILITIES,
  InspectionDefect,
} from '@/data/inspections';

interface DefectEditDialogProps {
  defect: DefectRow | null;
  onClose: () => void;
  onSave: (patch: Partial<InspectionDefect>) => void;
  busy?: boolean;
}

const DefectEditDialog = ({ defect, onClose, onSave, busy }: DefectEditDialogProps) => {
  const [f, setF] = useState<Partial<InspectionDefect>>({});

  useEffect(() => {
    if (!defect) return;
    setF({
      title: defect.title,
      normRef: defect.normRef,
      docRef: defect.docRef ?? '',
      place: defect.place ?? '',
      contractor: defect.contractor ?? '',
      deadline: defect.deadline,
      fixStatus: defect.fixStatus ?? 'не устранено',
      fixDate: defect.fixDate ?? '',
      responsibility: defect.responsibility ?? 'вопрос подрядчика',
      category: defect.category ?? '',
      measures: defect.measures ?? '',
      ackBy: defect.ackBy ?? '',
      extendNote: defect.extendNote ?? '',
      responsible: defect.responsible ?? '',
    });
  }, [defect]);

  const set = (patch: Partial<InspectionDefect>) => setF((p) => ({ ...p, ...patch }));

  const text = (label: string, key: keyof InspectionDefect, placeholder?: string, full?: boolean) => (
    <div className={cn('flex flex-col gap-1.5', full && 'sm:col-span-2')}>
      <Label className="text-[0.7em] uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </Label>
      <Input
        value={(f[key] as string) ?? ''}
        onChange={(e) => set({ [key]: e.target.value } as Partial<InspectionDefect>)}
        placeholder={placeholder}
        className="h-9 rounded-sm text-[0.88em]"
      />
    </div>
  );

  return (
    <Dialog open={!!defect} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl rounded-sm border-t-2 border-t-accent">
        <DialogHeader>
          <DialogTitle className="font-head text-[1.15em] uppercase tracking-[0.03em]">
            Карточка замечания
          </DialogTitle>
          <DialogDescription className="text-[0.85em]">
            Акт № {defect?.inspNumber} · пункт {defect?.pos} · {defect?.inspector}
          </DialogDescription>
        </DialogHeader>

        <div className="scrollbar-thin grid max-h-[62vh] gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label className="text-[0.7em] uppercase tracking-[0.1em] text-muted-foreground">
              Содержание замечания
            </Label>
            <Textarea
              value={f.title ?? ''}
              onChange={(e) => set({ title: e.target.value })}
              rows={3}
              className="resize-none rounded-sm text-[0.88em]"
            />
          </div>

          {text('Норматив и пункт', 'normRef', 'СП 45.13330.2017, п. 11.2.6', true)}
          {text('Ссылка на проектную документацию', 'docRef', 'МЯФ1-ОКП.2509-Р19-000-ЭМ01')}
          {text('Объект и местоположение', 'place', 'Куст скважин № 19')}
          {text('Подрядная организация', 'contractor', 'АО «Евракор»')}
          {text('Ответственный за проведение работ', 'responsible', 'Мастер СМР Иванов И.И.')}

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label className="text-[0.7em] uppercase tracking-[0.1em] text-muted-foreground">
              Характер замечания
            </Label>
            <select
              value={f.category ?? ''}
              onChange={(e) => set({ category: e.target.value })}
              className="h-9 rounded-sm border border-border bg-card px-2 text-[0.88em]"
            >
              <option value="">не выбрано</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-[0.7em] uppercase tracking-[0.1em] text-muted-foreground">
              Статус устранения
            </Label>
            <div className="grid grid-cols-3 gap-1.5">
              {FIX_STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => set({ fixStatus: s })}
                  className={cn(
                    'rounded-sm border px-2 py-2 text-[0.74em] transition-colors',
                    f.fixStatus === s
                      ? 'border-accent bg-accent text-accent-foreground'
                      : 'border-input hover:bg-secondary',
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-[0.7em] uppercase tracking-[0.1em] text-muted-foreground">
              Ответственность
            </Label>
            <div className="grid grid-cols-2 gap-1.5">
              {RESPONSIBILITIES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => set({ responsibility: s })}
                  className={cn(
                    'rounded-sm border px-2 py-2 text-[0.74em] transition-colors',
                    f.responsibility === s
                      ? 'border-accent bg-accent text-accent-foreground'
                      : 'border-input hover:bg-secondary',
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {text('Срок устранения', 'deadline', '10.09.2026')}
          {text('Дата фактического устранения', 'fixDate', '12.09.2026')}
          {text('С записью ознакомился', 'ackBy', 'Мастер СМР Петров П.П.', true)}

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label className="text-[0.7em] uppercase tracking-[0.1em] text-muted-foreground">
              Выполненные мероприятия
            </Label>
            <Textarea
              value={f.measures ?? ''}
              onChange={(e) => set({ measures: e.target.value })}
              rows={2}
              className="resize-none rounded-sm text-[0.88em]"
            />
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label className="text-[0.7em] uppercase tracking-[0.1em] text-muted-foreground">
              № и дата письма о продлении срока / комментарии
            </Label>
            <Textarea
              value={f.extendNote ?? ''}
              onChange={(e) => set({ extendNote: e.target.value })}
              rows={2}
              className="resize-none rounded-sm text-[0.88em]"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 rounded-sm" onClick={onClose}>
            Отмена
          </Button>
          <Button
            disabled={busy}
            onClick={() => onSave(f)}
            className="flex-1 gap-2 rounded-sm bg-accent font-head uppercase tracking-[0.06em] text-accent-foreground hover:bg-accent/90"
          >
            <Icon
              name={busy ? 'Loader2' : 'Check'}
              size={16}
              className={busy ? 'animate-spin' : ''}
            />
            Сохранить
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DefectEditDialog;
