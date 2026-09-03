import { useEffect, useState } from 'react';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useSpeech } from '@/hooks/useSpeech';
import { ProjectObject } from '@/data/store';
import { WORK_TYPES } from '@/data/inspections';

interface DictateDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  objects: ProjectObject[];
  busy?: boolean;
  onSave: (data: { objectId: string; workType: string; lines: string[] }) => void;
}

const splitLines = (raw: string) =>
  raw
    .split(/\n+/)
    .map((s) => s.trim().replace(/^[-–—•\d.)\s]+/, '').trim())
    .filter((s) => s.length > 2);

const DictateDialog = ({ open, onOpenChange, objects, busy, onSave }: DictateDialogProps) => {
  const [objectId, setObjectId] = useState('');
  const [workType, setWorkType] = useState(WORK_TYPES[0]);
  const [text, setText] = useState('');

  const { listening, interim, error, start, stop, supported } = useSpeech((chunk) =>
    setText((p) => (p ? `${p.trim()}\n${chunk.trim()}` : chunk.trim())),
  );

  useEffect(() => {
    if (open) {
      setText('');
      setObjectId((p) => p || objects[0]?.id || '');
    } else stop();
  }, [open, objects, stop]);

  const lines = splitLines(text);

  const save = () => {
    stop();
    onSave({ objectId, workType, lines });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (!v ? (stop(), onOpenChange(false)) : onOpenChange(v))}>
      <DialogContent className="max-w-lg rounded-sm border-t-2 border-t-accent">
        <DialogHeader>
          <DialogTitle className="font-head text-[1.25em] uppercase tracking-[0.03em]">
            Замечания голосом
          </DialogTitle>
          <DialogDescription className="text-[0.85em]">
            Говорите по одному замечанию — каждое станет отдельным пунктом акта.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-[0.72em] uppercase tracking-[0.1em] text-muted-foreground">
                Объект
              </span>
              <select
                value={objectId}
                onChange={(e) => setObjectId(e.target.value)}
                className="h-9 rounded-sm border border-border bg-card px-2 text-[0.88em]"
              >
                {objects.length === 0 && <option value="">Объектов нет</option>}
                {objects.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[0.72em] uppercase tracking-[0.1em] text-muted-foreground">
                Вид работ
              </span>
              <select
                value={workType}
                onChange={(e) => setWorkType(e.target.value)}
                className="h-9 rounded-sm border border-border bg-card px-2 text-[0.88em]"
              >
                {WORK_TYPES.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <button
            type="button"
            onClick={listening ? stop : start}
            className={cn(
              'flex items-center justify-center gap-2 rounded-sm px-4 py-3 font-head text-[0.95em] uppercase tracking-[0.06em] transition-colors',
              listening
                ? 'bg-foreground text-background'
                : 'bg-accent text-accent-foreground hover:bg-accent/90',
            )}
          >
            <Icon
              name={listening ? 'Square' : 'Mic'}
              size={18}
              className={listening ? 'animate-pulse' : ''}
            />
            {listening ? 'Остановить запись' : 'Начать говорить'}
          </button>

          {!supported && (
            <p className="text-[0.8em] text-muted-foreground">
              В этом браузере микрофон недоступен — впишите замечания вручную, по одному в строке.
            </p>
          )}
          {error && <p className="text-[0.8em] text-destructive">{error}</p>}

          <Textarea
            value={text + (interim ? `\n${interim}` : '')}
            onChange={(e) => setText(e.target.value)}
            rows={7}
            placeholder="Каждое замечание — с новой строки"
            className="resize-none rounded-sm text-[0.9em]"
          />

          <p className="text-[0.78em] text-muted-foreground">
            Замечаний распознано: <span className="text-accent">{lines.length}</span>
          </p>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 rounded-sm"
              onClick={() => onOpenChange(false)}
            >
              Отмена
            </Button>
            <Button
              disabled={busy || !objectId || lines.length === 0}
              onClick={save}
              className="flex-1 gap-2 rounded-sm bg-accent font-head uppercase tracking-[0.06em] text-accent-foreground hover:bg-accent/90"
            >
              <Icon name={busy ? 'Loader2' : 'Check'} size={16} className={busy ? 'animate-spin' : ''} />
              Создать акт
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DictateDialog;
