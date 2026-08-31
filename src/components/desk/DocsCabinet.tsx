import { useMemo, useRef, useState } from 'react';
import Panel from '@/components/desk/Panel';
import Empty from '@/components/desk/Empty';
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
import { ProjectObject } from '@/data/store';
import { useProfile } from '@/data/profile';
import {
  useDocuments,
  DocSection,
  SECTION_LABEL,
  SECTION_ICON,
  fmtSize,
  ProjectDoc,
} from '@/data/documents';
import {
  useOffline,
  saveOffline,
  dropOffline,
  dropAllOffline,
  openOffline,
  downloadOffline,
} from '@/data/offline';

interface DocsCabinetProps {
  object: ProjectObject;
  onBack: () => void;
}

const SECTIONS: DocSection[] = ['project', 'working', 'masterplan'];

const DocsCabinet = ({ object, onBack }: DocsCabinetProps) => {
  const { profile } = useProfile();
  const { toast } = useToast();
  const { items, loading, uploading, upload, remove } = useDocuments(object.id);
  const { ids: offlineIds, bytes: offlineBytes } = useOffline();

  const [section, setSection] = useState<DocSection | null>(null);
  const [uploadFor, setUploadFor] = useState<DocSection | null>(null);
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const canUpload = profile.role === 'coordinator' || profile.role === 'director';

  const bySection = useMemo(() => {
    const map: Record<DocSection, ProjectDoc[]> = { project: [], working: [], masterplan: [] };
    items.forEach((d) => map[d.section]?.push(d));
    return map;
  }, [items]);

  const doUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file || !uploadFor) {
      toast({ title: 'Выберите файл', variant: 'destructive' });
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      toast({ title: 'Файл больше 25 МБ', description: 'Разбейте на части.', variant: 'destructive' });
      return;
    }
    try {
      await upload(file, uploadFor, { title, note, by: profile.fio });
      toast({ title: 'Документ загружен', description: SECTION_LABEL[uploadFor] });
      setUploadFor(null);
      setTitle('');
      setNote('');
    } catch {
      toast({ title: 'Не удалось загрузить документ', variant: 'destructive' });
    }
  };

  const toggleOffline = async (doc: ProjectDoc) => {
    setBusy(doc.id);
    try {
      if (offlineIds.has(doc.id)) {
        await dropOffline(doc.id);
        toast({ title: 'Выгружено из памяти', description: doc.title });
      } else {
        const size = await saveOffline(doc);
        toast({ title: 'Сохранено в память', description: `${doc.title} · ${fmtSize(size)}` });
      }
    } catch {
      toast({ title: 'Нет связи с сервером', description: 'Повторите при интернете.', variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  const openDoc = async (doc: ProjectDoc) => {
    if (offlineIds.has(doc.id) && (await openOffline(doc.id))) return;
    window.open(doc.fileUrl, '_blank');
  };

  const saveDoc = async (doc: ProjectDoc) => {
    if (offlineIds.has(doc.id) && (await downloadOffline(doc.id))) return;
    const a = document.createElement('a');
    a.href = doc.fileUrl;
    a.download = doc.fileName;
    a.target = '_blank';
    a.click();
  };

  const clearMemory = async () => {
    await dropAllOffline();
    toast({ title: 'Память очищена', description: 'Все скачанные документы удалены с устройства.' });
  };

  const docRow = (d: ProjectDoc) => {
    const saved = offlineIds.has(d.id);
    return (
      <div key={d.id} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0">
        <span
          className={cn(
            'flex h-9 w-9 flex-none items-center justify-center rounded-sm',
            saved ? 'bg-accent text-accent-foreground' : 'bg-secondary text-muted-foreground',
          )}
        >
          <Icon name={saved ? 'HardDriveDownload' : 'File'} size={17} />
        </span>
        <button type="button" onClick={() => openDoc(d)} className="min-w-0 flex-1 text-left">
          <span className="block truncate font-head text-[0.95em] uppercase tracking-[0.02em]">
            {d.title}
          </span>
          <span className="block truncate text-[0.76em] text-muted-foreground">
            {fmtSize(d.fileSize)} · {new Date(d.createdAt).toLocaleDateString('ru')}
            {saved ? ' · в памяти' : ''}
            {d.note ? ` · ${d.note}` : ''}
          </span>
        </button>
        <div className="flex flex-none items-center gap-1">
          <button
            type="button"
            title="Скачать"
            onClick={() => saveDoc(d)}
            className="flex h-8 w-8 items-center justify-center rounded-sm bg-secondary transition-colors hover:bg-border"
          >
            <Icon name="Download" size={15} />
          </button>
          <button
            type="button"
            title={saved ? 'Выгрузить из памяти' : 'Сохранить в память телефона'}
            disabled={busy === d.id}
            onClick={() => toggleOffline(d)}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-sm transition-colors',
              saved
                ? 'bg-accent text-accent-foreground hover:bg-accent/80'
                : 'bg-secondary hover:bg-border',
            )}
          >
            <Icon
              name={busy === d.id ? 'Loader2' : saved ? 'Trash2' : 'HardDriveDownload'}
              size={15}
              className={busy === d.id ? 'animate-spin' : ''}
            />
          </button>
          {canUpload && (
            <button
              type="button"
              title="Удалить документ"
              onClick={() => {
                remove(d.id);
                toast({ title: 'Документ удалён' });
              }}
              className="flex h-8 w-8 items-center justify-center rounded-sm bg-secondary transition-colors hover:bg-destructive hover:text-destructive-foreground"
            >
              <Icon name="X" size={15} />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2.5">
      <div className="flex flex-none flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => (section ? setSection(null) : onBack())}
          className="flex items-center gap-1.5 rounded-sm border border-border bg-card px-2.5 py-1 text-[0.78em] uppercase tracking-[0.08em] transition-colors hover:border-accent hover:bg-secondary"
        >
          <Icon name="ArrowLeft" size={14} className="text-accent" />
          {section ? 'К разделам' : 'К меню объекта'}
        </button>
        {offlineBytes > 0 && (
          <button
            type="button"
            onClick={clearMemory}
            className="ml-auto flex items-center gap-1.5 rounded-sm border border-border bg-card px-2.5 py-1 text-[0.78em] uppercase tracking-[0.08em] transition-colors hover:border-destructive hover:text-destructive"
          >
            <Icon name="Eraser" size={14} />
            Очистить память · {fmtSize(offlineBytes)}
          </button>
        )}
      </div>

      <div className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
        <section className="flex-none rounded-sm border border-border border-t-2 border-t-accent bg-card px-4 py-4">
          <p className="text-[0.72em] uppercase tracking-[0.14em] text-muted-foreground">
            Проектный кабинет
          </p>
          <h1 className="mt-1 font-head text-[17px] uppercase leading-[1.15] tracking-[0.02em] sm:text-[23px]">
            {object.title}
          </h1>
          <p className="mt-1.5 text-[0.82em] text-muted-foreground">
            {canUpload
              ? 'Вы можете загружать и удалять документы объекта.'
              : 'Просмотр и скачивание. Загрузку выполняет менеджер проекта.'}
          </p>
        </section>

        {!section ? (
          <Panel title="Разделы документации" note={`${items.length} документов`}>
            <div className="grid gap-px bg-border sm:grid-cols-2">
              {SECTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSection(s)}
                  className={cn(
                    'group flex items-center gap-3 bg-card px-4 py-4 text-left transition-colors hover:bg-foreground hover:text-background',
                    s === 'masterplan' && 'sm:col-span-2',
                  )}
                >
                  <span className="flex h-11 w-11 flex-none items-center justify-center rounded-sm bg-accent text-accent-foreground">
                    <Icon name={SECTION_ICON[s]} fallback="Folder" size={21} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-head text-[1em] uppercase tracking-[0.03em]">
                      {SECTION_LABEL[s]}
                    </span>
                    <span className="block truncate text-[0.78em] text-muted-foreground group-hover:text-background/70">
                      {bySection[s].length
                        ? `${bySection[s].length} документов · ${
                            bySection[s].filter((d) => offlineIds.has(d.id)).length
                          } в памяти`
                        : loading
                          ? 'Загрузка…'
                          : 'Пока пусто'}
                    </span>
                  </span>
                  <Icon name="ChevronRight" size={18} className="flex-none opacity-40" />
                </button>
              ))}
            </div>
          </Panel>
        ) : (
          <Panel
            title={SECTION_LABEL[section]}
            note={`${bySection[section].length}`}
            action={
              canUpload ? (
                <button
                  type="button"
                  onClick={() => setUploadFor(section)}
                  className="ml-3 flex items-center gap-1.5 rounded-sm bg-accent px-2.5 py-1 text-[0.78em] uppercase tracking-[0.08em] text-accent-foreground transition-colors hover:bg-accent/90"
                >
                  <Icon name="Upload" size={14} />
                  Загрузить
                </button>
              ) : undefined
            }
          >
            {bySection[section].length === 0 ? (
              <Empty
                icon={SECTION_ICON[section]}
                title="Документов пока нет"
                hint={
                  canUpload
                    ? 'Нажмите «Загрузить», чтобы добавить файл.'
                    : 'Менеджер проекта ещё не разместил документы.'
                }
              />
            ) : (
              bySection[section].map(docRow)
            )}
          </Panel>
        )}
      </div>

      <Dialog open={uploadFor !== null} onOpenChange={(v) => !v && setUploadFor(null)}>
        <DialogContent className="max-w-md rounded-sm">
          <DialogHeader>
            <DialogTitle className="font-head text-[1.2em] uppercase tracking-[0.03em]">
              Загрузка документа
            </DialogTitle>
            <DialogDescription className="text-[0.85em]">
              {uploadFor ? SECTION_LABEL[uploadFor] : ''} · {object.title}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-[0.7em] uppercase tracking-[0.1em] text-muted-foreground">
                Файл (до 25 МБ)
              </Label>
              <Input ref={fileRef} type="file" className="h-9 rounded-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[0.7em] uppercase tracking-[0.1em] text-muted-foreground">
                Название
              </Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Например: Раздел АР. Лист 12"
                className="h-9 rounded-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[0.7em] uppercase tracking-[0.1em] text-muted-foreground">
                Примечание
              </Label>
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Шифр, ревизия, дата выпуска"
                className="h-9 rounded-sm"
              />
            </div>
          </div>

          <Button
            onClick={doUpload}
            disabled={uploading}
            className="gap-2 rounded-sm bg-accent font-head uppercase tracking-[0.06em] text-accent-foreground hover:bg-accent/90"
          >
            <Icon
              name={uploading ? 'Loader2' : 'Upload'}
              size={16}
              className={uploading ? 'animate-spin' : ''}
            />
            {uploading ? 'Загружаем…' : 'Загрузить'}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DocsCabinet;
