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
import {
  CARD_SUMMARY_FIELDS,
  DOC_STATUSES,
  DocSection,
  ObjectDoc,
  SECTION_INFO,
} from '@/data/objectdocs';

export interface UploadMeta {
  objectId: string;
  objectTitle: string;
  contractor: string;
  title: string;
  docNumber: string;
  docDate: string;
  period: string;
  note: string;
  status: string;
  summary: Record<string, string>;
}

interface DocUploadFormProps {
  open: boolean;
  section: DocSection;
  objects: { id: string; title: string }[];
  contractors: string[];
  edit: ObjectDoc | null;
  onClose: () => void;
  onUpload: (file: File, meta: UploadMeta) => Promise<void>;
  onSave: (meta: UploadMeta) => Promise<void>;
}

const emptyMeta = (): UploadMeta => ({
  objectId: '',
  objectTitle: '',
  contractor: '',
  title: '',
  docNumber: '',
  docDate: new Date().toISOString().slice(0, 10),
  period: '',
  note: '',
  status: 'актуально',
  summary: {},
});

const DocUploadForm = ({
  open,
  section,
  objects,
  contractors,
  edit,
  onClose,
  onUpload,
  onSave,
}: DocUploadFormProps) => {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [m, setM] = useState<UploadMeta>(emptyMeta);
  const [busy, setBusy] = useState(false);

  const isCard = section === 'card';
  const isGeo = section === 'geodesy';

  useEffect(() => {
    if (!open) return;
    setFile(null);
    setM(
      edit
        ? {
            objectId: edit.objectId,
            objectTitle: edit.objectTitle,
            contractor: edit.contractor,
            title: edit.title,
            docNumber: edit.docNumber,
            docDate: edit.docDate,
            period: edit.period,
            note: edit.note,
            status: edit.status,
            summary: edit.summary ?? {},
          }
        : emptyMeta(),
    );
  }, [open, edit]);

  const set = (patch: Partial<UploadMeta>) => setM((p) => ({ ...p, ...patch }));

  const pickObject = (title: string) => {
    const found = objects.find((o) => o.title === title);
    set({ objectTitle: title, objectId: found?.id ?? '' });
  };

  const run = async () => {
    if (!m.objectTitle.trim()) {
      toast({ title: 'Укажите объект', variant: 'destructive' });
      return;
    }
    if (!edit && !file) {
      toast({ title: 'Выберите файл', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      const meta = { ...m, title: m.title.trim() || file?.name.replace(/\.[^.]+$/, '') || '' };
      if (edit) await onSave(meta);
      else if (file) await onUpload(file, meta);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const text = (label: string, key: keyof UploadMeta, ph?: string, full?: boolean) => (
    <div className={cn('flex flex-col gap-1.5', full && 'sm:col-span-2')}>
      <Label className="text-[0.7em] uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </Label>
      <Input
        value={(m[key] as string) ?? ''}
        onChange={(e) => set({ [key]: e.target.value } as Partial<UploadMeta>)}
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
            {edit ? 'Карточка документа' : `Загрузить · ${SECTION_INFO[section].title}`}
          </DialogTitle>
          <DialogDescription className="text-[0.85em]">
            {SECTION_INFO[section].hint}
          </DialogDescription>
        </DialogHeader>

        <div className="scrollbar-thin grid max-h-[62vh] gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
          {!edit && (
            <div className="flex flex-col gap-2 sm:col-span-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className={cn(
                  'flex items-center gap-3 rounded-sm border border-dashed px-4 py-4 text-left transition-colors',
                  file ? 'border-accent bg-accent/5' : 'border-border hover:border-accent',
                )}
              >
                <Icon
                  name={file ? 'FileCheck' : 'Upload'}
                  size={22}
                  className="flex-none text-accent"
                />
                <span className="min-w-0">
                  <span className="block truncate text-[0.9em]">
                    {file ? file.name : 'Загрузить из файла'}
                  </span>
                  <span className="block text-[0.76em] text-muted-foreground">
                    {file
                      ? `${Math.max(1, Math.round(file.size / 1024))} КБ`
                      : 'Excel, Word, PDF или изображение'}
                  </span>
                </span>
              </button>

              {isGeo && (
                <button
                  type="button"
                  onClick={() => camRef.current?.click()}
                  className="flex items-center gap-3 rounded-sm border border-dashed border-border px-4 py-4 text-left transition-colors hover:border-accent"
                >
                  <Icon name="Camera" size={22} className="flex-none text-accent" />
                  <span className="min-w-0">
                    <span className="block text-[0.9em]">Сделать фото акта</span>
                    <span className="block text-[0.76em] text-muted-foreground">
                      Снимок сразу попадёт в хранилище
                    </span>
                  </span>
                </button>
              )}

              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.docx,.doc,.pdf,image/*"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <input
                ref={camRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label className="text-[0.7em] uppercase tracking-[0.1em] text-muted-foreground">
              Объект
            </Label>
            <Input
              list="doc-objects"
              value={m.objectTitle}
              onChange={(e) => pickObject(e.target.value)}
              placeholder="Куст скважин № 19"
              className="h-9 rounded-sm text-[0.88em]"
            />
            <datalist id="doc-objects">
              {objects.map((o) => (
                <option key={o.id} value={o.title} />
              ))}
            </datalist>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-[0.7em] uppercase tracking-[0.1em] text-muted-foreground">
              Подрядчик
            </Label>
            <Input
              list="doc-contractors-2"
              value={m.contractor}
              onChange={(e) => set({ contractor: e.target.value })}
              placeholder="АО «Евракор»"
              className="h-9 rounded-sm text-[0.88em]"
            />
            <datalist id="doc-contractors-2">
              {contractors.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>

          {text('Наименование документа', 'title', 'Сводка по СМР за сентябрь', true)}
          {text('Номер документа', 'docNumber', '№ 14')}

          <div className="flex flex-col gap-1.5">
            <Label className="text-[0.7em] uppercase tracking-[0.1em] text-muted-foreground">
              Дата документа
            </Label>
            <Input
              type="date"
              value={(m.docDate ?? '').slice(0, 10)}
              onChange={(e) => set({ docDate: e.target.value })}
              className="h-9 rounded-sm text-[0.88em]"
            />
          </div>

          {text('Период', 'period', 'сентябрь 2026')}

          <div className="flex flex-col gap-1.5">
            <Label className="text-[0.7em] uppercase tracking-[0.1em] text-muted-foreground">
              Статус
            </Label>
            <div className="grid grid-cols-3 gap-1.5">
              {DOC_STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => set({ status: s })}
                  className={cn(
                    'rounded-sm border px-2 py-2 text-[0.72em] transition-colors',
                    m.status === s
                      ? 'border-accent bg-accent text-accent-foreground'
                      : 'border-input hover:bg-secondary',
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {text('Примечание', 'note', 'обновлено вручную', true)}

          {isCard && (
            <div className="sm:col-span-2">
              <p className="mb-2 text-[0.7em] uppercase tracking-[0.1em] text-muted-foreground">
                Сводка для карточки объекта
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {CARD_SUMMARY_FIELDS.map((f) => (
                  <div key={f.key} className="flex flex-col gap-1.5">
                    <Label className="text-[0.7em] text-muted-foreground">{f.label}</Label>
                    <Input
                      value={m.summary[f.key] ?? ''}
                      onChange={(e) =>
                        set({ summary: { ...m.summary, [f.key]: e.target.value } })
                      }
                      className="h-9 rounded-sm text-[0.88em]"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
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
              name={busy ? 'Loader2' : edit ? 'Check' : 'Upload'}
              size={16}
              className={busy ? 'animate-spin' : ''}
            />
            {edit ? 'Сохранить' : 'Загрузить'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DocUploadForm;
