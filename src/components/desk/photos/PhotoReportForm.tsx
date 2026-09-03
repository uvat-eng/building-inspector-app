import { useEffect, useRef, useState } from 'react';
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
import { useContractor } from '@/data/orders';

export interface DraftShot {
  data: string;
  caption: string;
}

export interface ReportDraft {
  objectId: string;
  date: string;
  contractor: string;
  project: string;
  place: string;
  note: string;
  shots: DraftShot[];
}

interface Props {
  objects: ProjectObject[];
  inspector: string;
  busy?: boolean;
  onBack: () => void;
  onSave: (draft: ReportDraft) => void;
}

const CAPTION_HINTS = [
  'Общий вид места производства работ.',
  'Монтаж конструкций в проектное положение.',
  'Механическая зачистка сварного шва и околошовной зоны.',
  'Контроль катета сварного шва.',
  'Планировка грунта ручным способом.',
  'Уплотнение бетонной смеси глубинным вибратором.',
];

const PhotoReportForm = ({ objects, inspector, busy, onBack, onSave }: Props) => {
  const { toast } = useToast();
  const camRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [objectId, setObjectId] = useState(objects[0]?.id ?? '');
  const object = objects.find((o) => o.id === objectId);
  const { general, subs } = useContractor(objectId);

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [contractor, setContractor] = useState('');
  const [project, setProject] = useState('');
  const [place, setPlace] = useState('');
  const [note, setNote] = useState('');
  const [shots, setShots] = useState<DraftShot[]>([]);
  const [pick, setPick] = useState(false);
  const [loadingShots, setLoadingShots] = useState(false);

  useEffect(() => {
    if (!object) return;
    setProject((p) => p || object.field || '');
    setPlace((p) => p || object.title || '');
  }, [object]);

  useEffect(() => {
    if (!contractor && general?.name) setContractor(general.name);
  }, [general, contractor]);

  const names = [general?.name, ...subs.map((s) => s.name)].filter(Boolean) as string[];

  const takeFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setLoadingShots(true);
    try {
      const out: DraftShot[] = [];
      for (const f of Array.from(files))
        out.push({ data: await compressPhoto(f, 1600, 0.72), caption: '' });
      setShots((p) => [...p, ...out]);
      setPick(false);
      toast({ title: `Добавлено фото: ${out.length}`, description: 'Подпишите каждый снимок' });
    } catch {
      toast({ title: 'Не удалось прочитать фото', variant: 'destructive' });
    } finally {
      setLoadingShots(false);
      if (camRef.current) camRef.current.value = '';
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const setCaption = (i: number, caption: string) =>
    setShots((p) => p.map((s, k) => (k === i ? { ...s, caption } : s)));

  const move = (i: number, d: number) =>
    setShots((p) => {
      const next = [...p];
      const j = i + d;
      if (j < 0 || j >= next.length) return p;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const submit = () => {
    if (!objectId) {
      toast({ title: 'Выберите объект', variant: 'destructive' });
      return;
    }
    if (shots.length === 0) {
      toast({ title: 'Добавьте хотя бы одно фото', variant: 'destructive' });
      return;
    }
    onSave({ objectId, date, contractor, project, place, note, shots });
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
          Шапка фотоотчёта
        </h2>

        <div className="grid gap-3 p-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
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
              Дата отчёта
            </Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-sm"
            />
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label className="text-[0.72em] uppercase tracking-[0.1em] text-muted-foreground">
              Подрядная организация · 1-я строка шапки
            </Label>
            <Input
              value={contractor}
              onChange={(e) => setContractor(e.target.value)}
              list="contractor-list"
              placeholder="АО «ПремьерСтрой»."
              className="rounded-sm"
            />
            <datalist id="contractor-list">
              {names.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label className="text-[0.72em] uppercase tracking-[0.1em] text-muted-foreground">
              Наименование стройки · 2-я строка
            </Label>
            <Textarea
              value={project}
              onChange={(e) => setProject(e.target.value)}
              rows={2}
              placeholder="Обустройство Восточно-Мессояхского месторождения. Реконструкция кустовых площадок 2025-2026гг."
              className="resize-none rounded-sm text-[0.9em]"
            />
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label className="text-[0.72em] uppercase tracking-[0.1em] text-muted-foreground">
              Площадка и виды работ · 3-я строка
            </Label>
            <Input
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              placeholder="Кустовая площадка № 19. Сети электрические."
              className="rounded-sm"
            />
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label className="text-[0.72em] uppercase tracking-[0.1em] text-muted-foreground">
              Примечание (в документ не выводится)
            </Label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="rounded-sm"
            />
          </div>

          <p className="text-[0.8em] text-muted-foreground sm:col-span-2">
            Подпись: {inspector || 'инспектор не указан'}
          </p>
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

      {shots.length > 0 && (
        <section className="flex-none rounded-sm border border-border bg-card">
          <h2 className="flex items-center gap-3 border-b border-border px-4 py-3 font-head text-[0.88em] uppercase tracking-[0.12em]">
            Снимки и подписи
            <span className="ml-auto font-body normal-case tracking-normal text-muted-foreground">
              {shots.length}
            </span>
          </h2>
          <div className="grid gap-3 p-3 sm:grid-cols-2">
            {shots.map((s, i) => (
              <div key={s.data.slice(-32)} className="rounded-sm border border-border p-2">
                <div className="relative">
                  <img
                    src={s.data}
                    alt={`снимок ${i + 1}`}
                    className="aspect-[4/3] w-full rounded-sm object-cover"
                  />
                  <span className="absolute left-1.5 top-1.5 rounded-sm bg-foreground/80 px-1.5 py-0.5 text-[0.7em] text-background">
                    {i + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShots((p) => p.filter((_, k) => k !== i))}
                    className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:border-destructive hover:text-destructive"
                  >
                    <Icon name="X" size={13} />
                  </button>
                </div>
                <Input
                  value={s.caption}
                  onChange={(e) => setCaption(i, e.target.value)}
                  list="caption-hints"
                  placeholder="Подпись под фото"
                  className="mt-2 h-9 rounded-sm text-[0.86em]"
                />
                <div className="mt-1.5 flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => move(i, -1)}
                    className="flex h-7 flex-1 items-center justify-center rounded-sm border border-border text-muted-foreground transition-colors hover:border-accent hover:text-accent"
                  >
                    <Icon name="ArrowLeft" size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    className="flex h-7 flex-1 items-center justify-center rounded-sm border border-border text-muted-foreground transition-colors hover:border-accent hover:text-accent"
                  >
                    <Icon name="ArrowRight" size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <datalist id="caption-hints">
            {CAPTION_HINTS.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
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
