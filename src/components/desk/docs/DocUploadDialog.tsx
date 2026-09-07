import { useEffect, useRef, useState } from 'react';
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
import { DOC_FILE_KINDS } from '@/data/doccontrol';

interface DocUploadDialogProps {
  open: boolean;
  contractors: string[];
  onClose: () => void;
  onUpload: (file: File, meta: { contractor: string; kind: string; note: string }) => Promise<void>;
}

const DocUploadDialog = ({ open, contractors, onClose, onUpload }: DocUploadDialogProps) => {
  const { toast } = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [contractor, setContractor] = useState('');
  const [kind, setKind] = useState<string>(DOC_FILE_KINDS[0].id);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFile(null);
    setContractor(contractors[0] ?? '');
    setKind(DOC_FILE_KINDS[0].id);
    setNote('');
  }, [open, contractors]);

  const run = async () => {
    if (!file) {
      toast({ title: 'Выберите файл', variant: 'destructive' });
      return;
    }
    if (!contractor.trim()) {
      toast({ title: 'Укажите подрядчика', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      await onUpload(file, { contractor: contractor.trim(), kind, note });
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg rounded-sm border-t-2 border-t-accent">
        <DialogHeader>
          <DialogTitle className="font-head text-[1.15em] uppercase tracking-[0.03em]">
            Загрузить документ
          </DialogTitle>
          <DialogDescription className="text-[0.85em]">
            Файл сохраняется в системе и попадает в учёт по подрядчику.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => input.current?.click()}
            className={cn(
              'flex items-center gap-3 rounded-sm border border-dashed px-4 py-5 text-left transition-colors',
              file ? 'border-accent bg-accent/5' : 'border-border hover:border-accent',
            )}
          >
            <Icon
              name={file ? 'FileSpreadsheet' : 'Upload'}
              size={22}
              className="flex-none text-accent"
            />
            <span className="min-w-0">
              <span className="block truncate text-[0.9em]">
                {file ? file.name : 'Выберите файл Excel, Word или PDF'}
              </span>
              <span className="block text-[0.76em] text-muted-foreground">
                {file ? `${Math.max(1, Math.round(file.size / 1024))} КБ` : 'до 15 МБ'}
              </span>
            </span>
          </button>
          <input
            ref={input}
            type="file"
            accept=".xlsx,.xls,.docx,.doc,.pdf"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />

          <div className="flex flex-col gap-1.5">
            <Label className="text-[0.7em] uppercase tracking-[0.1em] text-muted-foreground">
              Подрядчик
            </Label>
            <Input
              list="upload-contractors"
              value={contractor}
              onChange={(e) => setContractor(e.target.value)}
              placeholder="АО «ЕВРАКОР» (обустройство)"
              className="h-9 rounded-sm text-[0.88em]"
            />
            <datalist id="upload-contractors">
              {contractors.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-[0.7em] uppercase tracking-[0.1em] text-muted-foreground">
              Тип документа
            </Label>
            <div className="grid gap-1.5">
              {DOC_FILE_KINDS.map((k) => (
                <button
                  key={k.id}
                  type="button"
                  onClick={() => setKind(k.id)}
                  className={cn(
                    'rounded-sm border px-3 py-2 text-left text-[0.82em] transition-colors',
                    kind === k.id
                      ? 'border-accent bg-accent text-accent-foreground'
                      : 'border-input hover:bg-secondary',
                  )}
                >
                  {k.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-[0.7em] uppercase tracking-[0.1em] text-muted-foreground">
              Примечание
            </Label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="за сентябрь 2026"
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
            onClick={run}
            className="flex-1 gap-2 rounded-sm bg-accent font-head uppercase tracking-[0.06em] text-accent-foreground hover:bg-accent/90"
          >
            <Icon
              name={busy ? 'Loader2' : 'Upload'}
              size={16}
              className={busy ? 'animate-spin' : ''}
            />
            Загрузить
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DocUploadDialog;
