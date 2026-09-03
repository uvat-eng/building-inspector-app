import { useRef, useState } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { compressPhoto } from '@/data/photoQueue';
import { ProjectObject } from '@/data/store';
import { WORK_TYPES } from '@/data/inspections';

export interface ReportDraft {
  objectId: string;
  date: string;
  workType: string;
  place: string;
  note: string;
  photos: string[];
}

interface Props {
  objects: ProjectObject[];
  inspector: string;
  busy?: boolean;
  onBack: () => void;
  onSave: (draft: ReportDraft) => void;
}

const PhotoReportForm = ({ objects, inspector, busy, onBack, onSave }: Props) => {
  const { toast } = useToast();
  const camRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [objectId, setObjectId] = useState(objects[0]?.id ?? '');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [workType, setWorkType] = useState('');
  const [place, setPlace] = useState('');
  const [note, setNote] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [pick, setPick] = useState(false);
  const [loadingShots, setLoadingShots] = useState(false);

  const takeFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setLoadingShots(true);
    try {
      const out: string[] = [];
      for (const f of Array.from(files)) out.push(await compressPhoto(f));
      setPhotos((p) => [...p, ...out]);
      setPick(false);
      toast({ title: `Добавлено фото: ${out.length}` });
    } catch {
      toast({ title: 'Не удалось прочитать фото', variant: 'destructive' });
    } finally {
      setLoadingShots(false);
      if (camRef.current) camRef.current.value = '';
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const submit = () => {
    if (!objectId) {
      toast({ title: 'Выберите объект', variant: 'destructive' });
      return;
    }
    if (photos.length === 0) {
      toast({ title: 'Добавьте хотя бы одно фото', variant: 'destructive' });
      return;
    }
    onSave({ objectId, date, workType, place, note, photos });
  };

  return (
    <div className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
      <button
        type="button"
        onClick={onBack}
        className="flex w-fit flex-none items-center gap-1.5 rounded-sm border border-border bg-card px-2.5 py-1 text-[0.78em] uppercase tracking-[0.08em] transition-colors hover:border-accent hover:bg-secondary"
      >
        <Icon name="ArrowLeft" size={14} className="text-accent" />
        К фотоотчётам
      </button>

      <section className="flex-none rounded-sm border border-border border-t-2 border-t-accent bg-card">
        <h2 className="border-b border-border px-4 py-3 font-head text-[0.88em] uppercase tracking-[0.12em]">
          Форма фотоотчёта
        </h2>

        <div className="grid gap-3 p-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label className="text-[0.72em] uppercase tracking-[0.1em] text-muted-foreground">
              Объект
            </Label>
            <select
              value={objectId}
              onChange={(e) => setObjectId(e.target.value)}
              className="h-10 rounded-sm border border-border bg-card px-2 text-[0.9em]"
            >
              {objects.length === 0 && <option value="">Объекты не назначены</option>}
              {objects.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.title} · {o.regionName}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-[0.72em] uppercase tracking-[0.1em] text-muted-foreground">
              Дата съёмки
            </Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-sm"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-[0.72em] uppercase tracking-[0.1em] text-muted-foreground">
              Инспектор
            </Label>
            <Input value={inspector} readOnly className="rounded-sm bg-secondary/50" />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-[0.72em] uppercase tracking-[0.1em] text-muted-foreground">
              Вид работ
            </Label>
            <select
              value={workType}
              onChange={(e) => setWorkType(e.target.value)}
              className="h-10 rounded-sm border border-border bg-card px-2 text-[0.9em]"
            >
              <option value="">Не указан</option>
              {WORK_TYPES.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-[0.72em] uppercase tracking-[0.1em] text-muted-foreground">
              Место съёмки
            </Label>
            <Input
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              placeholder="Захватка 2, ось 5-7"
              className="rounded-sm"
            />
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label className="text-[0.72em] uppercase tracking-[0.1em] text-muted-foreground">
              Описание
            </Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Что зафиксировано на снимках"
              className="resize-none rounded-sm text-[0.9em]"
            />
          </div>
        </div>
      </section>

      <Button
        onClick={() => setPick(true)}
        disabled={loadingShots}
        className="h-14 flex-none gap-3 rounded-sm bg-accent font-head text-[1.05em] uppercase tracking-[0.06em] text-accent-foreground hover:bg-accent/90"
      >
        <Icon
          name={loadingShots ? 'Loader2' : 'Camera'}
          size={22}
          className={loadingShots ? 'animate-spin' : ''}
        />
        Фотографировать
      </Button>

      {photos.length > 0 && (
        <section className="flex-none rounded-sm border border-border bg-card">
          <h2 className="flex items-center gap-3 border-b border-border px-4 py-3 font-head text-[0.88em] uppercase tracking-[0.12em]">
            Снимки отчёта
            <span className="ml-auto font-body normal-case tracking-normal text-muted-foreground">
              {photos.length}
            </span>
          </h2>
          <div className="grid grid-cols-3 gap-2 p-3 sm:grid-cols-4 md:grid-cols-5">
            {photos.map((p, k) => (
              <span key={p.slice(-28)} className="group relative">
                <img
                  src={p}
                  alt={`снимок ${k + 1}`}
                  className="aspect-square w-full rounded-sm border border-border object-cover"
                />
                <button
                  type="button"
                  onClick={() => setPhotos((prev) => prev.filter((x) => x !== p))}
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:border-destructive hover:text-destructive"
                >
                  <Icon name="X" size={12} />
                </button>
              </span>
            ))}
          </div>
        </section>
      )}

      <div className="flex flex-none gap-2 pb-1">
        <Button variant="outline" className="flex-1 rounded-sm" onClick={onBack}>
          Отмена
        </Button>
        <Button
          disabled={busy}
          onClick={submit}
          className={cn(
            'flex-1 gap-2 rounded-sm font-head uppercase tracking-[0.06em]',
            'bg-accent text-accent-foreground hover:bg-accent/90',
          )}
        >
          <Icon name={busy ? 'Loader2' : 'Check'} size={17} className={busy ? 'animate-spin' : ''} />
          Сохранить фотоотчёт
        </Button>
      </div>

      <Dialog open={pick} onOpenChange={setPick}>
        <DialogContent className="max-w-sm rounded-sm border-t-2 border-t-accent">
          <DialogHeader>
            <DialogTitle className="font-head text-[1.15em] uppercase tracking-[0.03em]">
              Добавить фото
            </DialogTitle>
            <DialogDescription className="text-[0.85em]">
              Снимите на камеру или выберите готовые файлы.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <button
              type="button"
              onClick={() => camRef.current?.click()}
              className="group flex items-center gap-3 rounded-sm border border-border px-4 py-4 text-left transition-colors hover:border-accent hover:bg-secondary"
            >
              <span className="flex h-11 w-11 flex-none items-center justify-center rounded-sm bg-accent text-accent-foreground">
                <Icon name="Camera" size={21} />
              </span>
              <span className="min-w-0">
                <span className="block font-head text-[0.98em] uppercase tracking-[0.03em]">
                  Сделать новое фото
                </span>
                <span className="block text-[0.8em] text-muted-foreground">
                  Откроется камера устройства
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="group flex items-center gap-3 rounded-sm border border-border px-4 py-4 text-left transition-colors hover:border-accent hover:bg-secondary"
            >
              <span className="flex h-11 w-11 flex-none items-center justify-center rounded-sm bg-secondary text-accent">
                <Icon name="FolderOpen" size={21} />
              </span>
              <span className="min-w-0">
                <span className="block font-head text-[0.98em] uppercase tracking-[0.03em]">
                  Загрузить из телефона
                </span>
                <span className="block text-[0.8em] text-muted-foreground">
                  Галерея, папки, файлы
                </span>
              </span>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <input
        ref={camRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => takeFiles(e.target.files)}
      />
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => takeFiles(e.target.files)}
      />
    </div>
  );
};

export default PhotoReportForm;
