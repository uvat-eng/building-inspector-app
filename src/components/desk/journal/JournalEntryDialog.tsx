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
  JournalEntry,
  JOURNAL_CATEGORIES,
  JOURNAL_RESPONSIBILITIES,
  JOURNAL_STATUSES,
} from '@/data/journal';

interface JournalEntryDialogProps {
  open: boolean;
  entry: JournalEntry | null;
  objects: string[];
  inspector: string;
  busy?: boolean;
  onClose: () => void;
  onSave: (patch: Partial<JournalEntry>) => void;
}

const empty: Partial<JournalEntry> = {
  date: new Date().toISOString().slice(0, 10),
  fixStatus: 'не устранено',
  responsibility: 'вопрос подрядчика',
};

const JournalEntryDialog = ({
  open,
  entry,
  objects,
  inspector,
  busy,
  onClose,
  onSave,
}: JournalEntryDialogProps) => {
  const [f, setF] = useState<Partial<JournalEntry>>(empty);

  useEffect(() => {
    if (!open) return;
    setF(
      entry
        ? { ...entry }
        : {
            ...empty,
            objectTitle: objects[0] ?? '',
            recordedBy: inspector ? `Инженер СК ${inspector}` : '',
          },
    );
  }, [open, entry, objects, inspector]);

  const set = (patch: Partial<JournalEntry>) => setF((p) => ({ ...p, ...patch }));

  const line = (label: string, key: keyof JournalEntry, placeholder?: string, full?: boolean) => (
    <div className={cn('flex flex-col gap-1.5', full && 'sm:col-span-2')}>
      <Label className="text-[0.7em] uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </Label>
      <Input
        value={(f[key] as string) ?? ''}
        onChange={(e) => set({ [key]: e.target.value } as Partial<JournalEntry>)}
        placeholder={placeholder}
        className="h-9 rounded-sm text-[0.88em]"
      />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl rounded-sm border-t-2 border-t-accent">
        <DialogHeader>
          <DialogTitle className="font-head text-[1.15em] uppercase tracking-[0.03em]">
            {entry ? 'Запись журнала' : 'Новая запись журнала'}
          </DialogTitle>
          <DialogDescription className="text-[0.85em]">
            Заполняется по форме индивидуального журнала замечаний ИСК
          </DialogDescription>
        </DialogHeader>

        <div className="scrollbar-thin grid max-h-[62vh] gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label className="text-[0.7em] uppercase tracking-[0.1em] text-muted-foreground">
              Дата
            </Label>
            <Input
              type="date"
              value={(f.date ?? '').slice(0, 10)}
              onChange={(e) => set({ date: e.target.value })}
              className="h-9 rounded-sm text-[0.88em]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-[0.7em] uppercase tracking-[0.1em] text-muted-foreground">
              Объект (вкладка журнала)
            </Label>
            <Input
              list="journal-objects"
              value={f.objectTitle ?? ''}
              onChange={(e) => set({ objectTitle: e.target.value })}
              placeholder="КСсУПГ"
              className="h-9 rounded-sm text-[0.88em]"
            />
            <datalist id="journal-objects">
              {objects.map((o) => (
                <option key={o} value={o} />
              ))}
            </datalist>
          </div>

          {line('Организация', 'contractor', 'АО «ПремьерСтрой»', true)}

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label className="text-[0.7em] uppercase tracking-[0.1em] text-muted-foreground">
              Содержание замечания и предложения
            </Label>
            <Textarea
              value={f.content ?? ''}
              onChange={(e) => set({ content: e.target.value })}
              rows={4}
              placeholder="При повторной проверке ПСД выявлено…"
              className="resize-none rounded-sm text-[0.88em]"
            />
          </div>

          {line('Запись произвел', 'recordedBy', 'Инженер СК Горовцов М.В.')}
          {line('С записью ознакомился', 'ackBy', 'Инженер ПТО Кашапова В.А.')}

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

          <div className="flex flex-col gap-1.5">
            <Label className="text-[0.7em] uppercase tracking-[0.1em] text-muted-foreground">
              Отчёт об устранении
            </Label>
            <div className="grid grid-cols-2 gap-1.5">
              {JOURNAL_STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => set({ fixStatus: s })}
                  className={cn(
                    'rounded-sm border px-2 py-2 text-[0.76em] transition-colors',
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
              Дата устранения
            </Label>
            <Input
              type="date"
              value={(f.fixDate ?? '').slice(0, 10)}
              onChange={(e) => set({ fixDate: e.target.value })}
              className="h-9 rounded-sm text-[0.88em]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-[0.7em] uppercase tracking-[0.1em] text-muted-foreground">
              Ответственность
            </Label>
            <div className="grid grid-cols-2 gap-1.5">
              {JOURNAL_RESPONSIBILITIES.map((s) => (
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

          <div className="flex flex-col gap-1.5">
            <Label className="text-[0.7em] uppercase tracking-[0.1em] text-muted-foreground">
              Характер замечания
            </Label>
            <select
              value={f.category ?? ''}
              onChange={(e) => set({ category: e.target.value })}
              className="h-9 rounded-sm border border-border bg-card px-2 text-[0.88em]"
            >
              <option value="">не выбрано</option>
              {JOURNAL_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label className="text-[0.7em] uppercase tracking-[0.1em] text-muted-foreground">
              Выдано предписание / комментарии
            </Label>
            <Textarea
              value={f.orderNote ?? ''}
              onChange={(e) => set({ orderNote: e.target.value })}
              rows={2}
              placeholder="Продлено до 25.07.2026 согласно протоколу «Час качества»"
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

export default JournalEntryDialog;
