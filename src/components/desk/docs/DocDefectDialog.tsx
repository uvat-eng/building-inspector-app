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
import { DocDefect } from '@/data/doccontrol';

interface DocDefectDialogProps {
  open: boolean;
  defect: DocDefect | null;
  contractors: string[];
  inspector: string;
  busy?: boolean;
  onClose: () => void;
  onSave: (patch: Partial<DocDefect>) => void;
}

const DocDefectDialog = ({
  open,
  defect,
  contractors,
  inspector,
  busy,
  onClose,
  onSave,
}: DocDefectDialogProps) => {
  const [f, setF] = useState<Partial<DocDefect>>({});

  useEffect(() => {
    if (!open) return;
    setF(
      defect
        ? { ...defect }
        : {
            date: new Date().toISOString().slice(0, 10),
            contractor: contractors[0] ?? '',
            fixStatus: 'не устранено',
            recordedBy: inspector,
          },
    );
  }, [open, defect, contractors, inspector]);

  const set = (patch: Partial<DocDefect>) => setF((p) => ({ ...p, ...patch }));

  const text = (label: string, key: keyof DocDefect, ph?: string, full?: boolean) => (
    <div className={cn('flex flex-col gap-1.5', full && 'sm:col-span-2')}>
      <Label className="text-[0.7em] uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </Label>
      <Input
        value={(f[key] as string) ?? ''}
        onChange={(e) => set({ [key]: e.target.value } as Partial<DocDefect>)}
        placeholder={ph}
        className="h-9 rounded-sm text-[0.88em]"
      />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl rounded-sm border-t-2 border-t-accent">
        <DialogHeader>
          <DialogTitle className="font-head text-[1.15em] uppercase tracking-[0.03em]">
            {defect ? 'Замечание по документации' : 'Новое замечание по документации'}
          </DialogTitle>
          <DialogDescription className="text-[0.85em]">
            Попадёт в лист «Журнал_» отчёта о проверке ИТД
          </DialogDescription>
        </DialogHeader>

        <div className="scrollbar-thin grid max-h-[62vh] gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label className="text-[0.7em] uppercase tracking-[0.1em] text-muted-foreground">
              Дата выдачи
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
              Организация
            </Label>
            <Input
              list="doc-defect-contractors"
              value={f.contractor ?? ''}
              onChange={(e) => set({ contractor: e.target.value })}
              className="h-9 rounded-sm text-[0.88em]"
            />
            <datalist id="doc-defect-contractors">
              {contractors.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>

          {text('Объект / шифр', 'objectTitle', '853.13-(Р39)-АСЭ')}
          {text('Позиция', 'position', 'Глава 3')}

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label className="text-[0.7em] uppercase tracking-[0.1em] text-muted-foreground">
              Содержание замечания
            </Label>
            <Textarea
              value={f.content ?? ''}
              onChange={(e) => set({ content: e.target.value })}
              rows={4}
              placeholder="Не предоставлен общий журнал работ…"
              className="resize-none rounded-sm text-[0.88em]"
            />
          </div>

          {text('Запись произвел', 'recordedBy', 'Сивков М.А.')}
          {text('С записью ознакомился', 'ackBy', 'Хисматулин В.В.')}

          <div className="flex flex-col gap-1.5">
            <Label className="text-[0.7em] uppercase tracking-[0.1em] text-muted-foreground">
              Отчёт об устранении
            </Label>
            <div className="grid grid-cols-2 gap-1.5">
              {['не устранено', 'устранено'].map((s) => (
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

export default DocDefectDialog;
