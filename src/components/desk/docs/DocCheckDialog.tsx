import { useEffect, useState } from 'react';
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
import { DocCheck } from '@/data/doccontrol';

interface DocCheckDialogProps {
  open: boolean;
  check: DocCheck | null;
  contractors: string[];
  busy?: boolean;
  onClose: () => void;
  onSave: (patch: Partial<DocCheck>) => void;
}

const NUM_FIELDS: [keyof DocCheck, string][] = [
  ['planned', 'Планируется папок'],
  ['archived', 'Сдано в архив'],
  ['certs', 'Выдано справок НТН'],
  ['sent1', 'Передано на 1-ю проверку'],
  ['back1', 'Возвращено после 1-й'],
  ['issued1', 'Замечаний по 1-й проверке'],
  ['sent2', 'Передано на повторную'],
  ['back2', 'Возвращено после повторной'],
  ['issued2', 'Замечаний по повторной'],
  ['open2', 'Не устранено замечаний'],
];

const DocCheckDialog = ({
  open,
  check,
  contractors,
  busy,
  onClose,
  onSave,
}: DocCheckDialogProps) => {
  const [f, setF] = useState<Partial<DocCheck>>({});

  useEffect(() => {
    if (!open) return;
    setF(check ? { ...check } : { contractor: contractors[0] ?? '' });
  }, [open, check, contractors]);

  const set = (patch: Partial<DocCheck>) => setF((p) => ({ ...p, ...patch }));

  const text = (label: string, key: keyof DocCheck, ph?: string, full?: boolean) => (
    <div className={cn('flex flex-col gap-1.5', full && 'sm:col-span-2')}>
      <Label className="text-[0.7em] uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </Label>
      <Input
        value={(f[key] as string) ?? ''}
        onChange={(e) => set({ [key]: e.target.value } as Partial<DocCheck>)}
        placeholder={ph}
        className="h-9 rounded-sm text-[0.88em]"
      />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl rounded-sm border-t-2 border-t-accent">
        <DialogHeader>
          <DialogTitle className="font-head text-[1.15em] uppercase tracking-[0.03em]">
            {check ? 'Строка проверки' : 'Новая строка проверки'}
          </DialogTitle>
          <DialogDescription className="text-[0.85em]">
            Раздел документации и движение папок по проверкам НТН
          </DialogDescription>
        </DialogHeader>

        <div className="scrollbar-thin grid max-h-[62vh] gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label className="text-[0.7em] uppercase tracking-[0.1em] text-muted-foreground">
              Подрядчик
            </Label>
            <Input
              list="doc-contractors"
              value={f.contractor ?? ''}
              onChange={(e) => set({ contractor: e.target.value })}
              placeholder="АО «ЕВРАКОР» (обустройство)"
              className="h-9 rounded-sm text-[0.88em]"
            />
            <datalist id="doc-contractors">
              {contractors.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>

          {text('Раздел / шифр проекта', 'section', '108.17-Р53, Электроснабжение', true)}
          {text('Папка и глава', 'folder', 'Папка 1/31 Глава 1')}
          {text('Объект', 'objectTitle', 'Куст скважин № 53')}
          {text('Ответственный представитель НТН', 'repNtn', 'Иванов И.И.', true)}

          {NUM_FIELDS.map(([key, label]) => (
            <div key={key} className="flex flex-col gap-1.5">
              <Label className="text-[0.7em] uppercase tracking-[0.1em] text-muted-foreground">
                {label}
              </Label>
              <Input
                type="number"
                min={0}
                value={String(f[key] ?? 0)}
                onChange={(e) =>
                  set({ [key]: Number(e.target.value) || 0 } as Partial<DocCheck>)
                }
                className="h-9 rounded-sm text-[0.88em]"
              />
            </div>
          ))}

          <div className="flex flex-col gap-1.5">
            <Label className="text-[0.7em] uppercase tracking-[0.1em] text-muted-foreground">
              Дата выдачи замечаний
            </Label>
            <Input
              type="date"
              value={(f.date1 ?? '').slice(0, 10)}
              onChange={(e) => set({ date1: e.target.value })}
              className="h-9 rounded-sm text-[0.88em]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-[0.7em] uppercase tracking-[0.1em] text-muted-foreground">
              Дата повторной проверки
            </Label>
            <Input
              type="date"
              value={(f.date2 ?? '').slice(0, 10)}
              onChange={(e) => set({ date2: e.target.value })}
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

export default DocCheckDialog;
