import { useMemo, useRef, useState } from 'react';
import { usePersistedState } from '@/hooks/usePersistedState';
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
import { useFolders, FolderSection, SECTION_TITLE, SUBSECTIONS, PhotoFolder } from '@/data/folders';
import { usePhotoQueue, queuePhoto, flushQueue, isWifi } from '@/data/photoQueue';

interface FoldersCabinetProps {
  object: ProjectObject;
  section: FolderSection;
  onBack: () => void;
}

const FoldersCabinet = ({ object, section, onBack }: FoldersCabinetProps) => {
  const { toast } = useToast();
  const { profile } = useProfile();
  const { items, loading, create, remove, removePhoto, reload } = useFolders(object.id, section);
  const { photos: queued, pending, refresh } = usePhotoQueue();

  const subs = SUBSECTIONS[section];
  const [sub, setSub] = usePersistedState<string | null>(
    `gsi-fold-sub-${object.id}-${section}`,
    subs.length ? null : '',
  );
  const [openId, setOpenId] = usePersistedState<string | null>(
    `gsi-fold-open-${object.id}-${section}`,
    null,
  );
  const open = items.find((f) => f.id === openId) ?? null;
  const setOpen = (f: PhotoFolder | null) => setOpenId(f?.id ?? null);
  const [newOpen, setNewOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const camRef = useRef<HTMLInputElement>(null);

  const list = useMemo(
    () => (sub === null ? items : items.filter((f) => f.subsection === sub)),
    [items, sub],
  );

  const localByFolder = useMemo(() => {
    const map = new Map<string, string[]>();
    queued
      .filter((p) => p.target === 'folder' && !p.sent)
      .forEach((p) => map.set(p.defectId, [...(map.get(p.defectId) ?? []), p.dataUrl]));
    return map;
  }, [queued]);

  const addFolder = async () => {
    if (!title.trim()) {
      toast({ title: 'Введите название документа', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      await create(title.trim(), sub ?? '', '', profile.fio);
      setTitle('');
      setNewOpen(false);
    } catch {
      toast({ title: 'Не удалось создать папку', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const shoot = async (files: FileList | null) => {
    if (!files?.length || !open) return;
    setBusy(true);
    try {
      for (const f of Array.from(files)) {
        await queuePhoto(object.id, open.id, f, 'folder');
      }
      refresh();
      toast({
        title: `Снимков сохранено: ${files.length}`,
        description: isWifi() ? 'Отправляем на сервер…' : 'Выгрузим при подключении к Wi-Fi.',
      });
      if (isWifi())
        flushQueue()
          .then(() => {
            refresh();
            reload();
          })
          .catch(() => undefined);
    } catch {
      toast({ title: 'Не удалось сохранить фото', variant: 'destructive' });
    } finally {
      setBusy(false);
      if (camRef.current) camRef.current.value = '';
    }
  };

  const sendNow = async () => {
    const { sent } = await flushQueue(true);
    refresh();
    await reload();
    toast({ title: sent ? `Отправлено фото: ${sent}` : 'Нет связи с сервером' });
  };

  const subLabel = subs.find((s) => s.id === sub)?.label;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2.5">
      <div className="flex flex-none flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            if (open) setOpen(null);
            else if (sub !== null && subs.length) setSub(null);
            else onBack();
          }}
          className="flex items-center gap-1.5 rounded-sm border border-border bg-card px-2.5 py-1 text-[0.78em] uppercase tracking-[0.08em] transition-colors hover:border-accent hover:bg-secondary"
        >
          <Icon name="ArrowLeft" size={14} className="text-accent" />
          {open ? 'К папкам' : sub !== null && subs.length ? 'К разделам' : 'К меню объекта'}
        </button>
        {pending > 0 && (
          <button
            type="button"
            onClick={sendNow}
            className="ml-auto flex items-center gap-1.5 rounded-sm border border-warning bg-card px-2.5 py-1 text-[0.78em] uppercase tracking-[0.08em] text-warning transition-colors hover:bg-secondary"
          >
            <Icon name="CloudUpload" size={14} />
            В очереди {pending} · отправить
          </button>
        )}
      </div>

      <div className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
        <section className="flex-none rounded-sm border border-border border-t-2 border-t-accent bg-card px-4 py-4">
          <p className="text-[0.72em] uppercase tracking-[0.14em] text-muted-foreground">
            {subLabel ?? SECTION_TITLE[section]}
          </p>
          <h1 className="mt-1 font-head text-[16px] uppercase leading-[1.2] tracking-[0.02em] sm:text-[21px]">
            {open ? open.title : object.title}
          </h1>
          {open && (
            <p className="mt-1.5 text-[0.8em] text-muted-foreground">
              Создал: {open.createdBy || '—'} ·{' '}
              {new Date(open.createdAt).toLocaleDateString('ru')}
            </p>
          )}
        </section>

        {open ? (
          <Panel
            title="Фотографии документа"
            note={`${open.photos.length + (localByFolder.get(open.id)?.length ?? 0)}`}
            action={
              <button
                type="button"
                onClick={() => camRef.current?.click()}
                className="ml-3 flex items-center gap-1.5 rounded-sm bg-accent px-2.5 py-1 text-[0.78em] uppercase tracking-[0.08em] text-accent-foreground transition-colors hover:bg-accent/90"
              >
                <Icon name={busy ? 'Loader2' : 'Camera'} size={14} className={busy ? 'animate-spin' : ''} />
                Снять
              </button>
            }
          >
            {open.photos.length === 0 && !localByFolder.get(open.id)?.length ? (
              <Empty
                icon="Camera"
                title="Фотографий нет"
                hint="Нажмите «Снять» — откроется камера телефона."
              />
            ) : (
              <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3">
                {open.photos.map((p) => (
                  <div key={p.id} className="group relative">
                    <button
                      type="button"
                      onClick={() => window.open(p.url, '_blank')}
                      className="block aspect-square w-full overflow-hidden rounded-sm border border-border"
                    >
                      <img src={p.url} alt="" className="h-full w-full object-cover" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removePhoto(open.id, p.id)}
                      className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-sm bg-background/85 text-foreground transition-colors hover:bg-destructive hover:text-destructive-foreground"
                    >
                      <Icon name="X" size={14} />
                    </button>
                  </div>
                ))}
                {(localByFolder.get(open.id) ?? []).map((src, i) => (
                  <div key={`local-${i}`} className="relative">
                    <div className="aspect-square w-full overflow-hidden rounded-sm border border-warning">
                      <img src={src} alt="" className="h-full w-full object-cover opacity-80" />
                    </div>
                    <span className="absolute bottom-1 left-1 rounded-sm bg-warning px-1.5 py-0.5 text-[0.62em] uppercase tracking-[0.08em] text-background">
                      в очереди
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        ) : sub === null && subs.length ? (
          <Panel title="Разделы" note={`${items.length} папок`}>
            <div className="grid gap-px bg-border sm:grid-cols-2">
              {subs.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSub(s.id)}
                  className="group flex items-center gap-3 bg-card px-4 py-4 text-left transition-colors hover:bg-foreground hover:text-background"
                >
                  <span className="flex h-11 w-11 flex-none items-center justify-center rounded-sm bg-accent text-accent-foreground">
                    <Icon name={s.icon} fallback="Folder" size={21} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-head text-[1em] uppercase tracking-[0.03em]">
                      {s.label}
                    </span>
                    <span className="block truncate text-[0.78em] text-muted-foreground group-hover:text-background/70">
                      {items.filter((f) => f.subsection === s.id).length} папок
                    </span>
                  </span>
                  <Icon name="ChevronRight" size={18} className="flex-none opacity-40" />
                </button>
              ))}
            </div>
          </Panel>
        ) : (
          <Panel
            title="Папки документов"
            note={`${list.length}`}
            action={
              <button
                type="button"
                onClick={() => setNewOpen(true)}
                className="ml-3 flex items-center gap-1.5 rounded-sm bg-accent px-2.5 py-1 text-[0.78em] uppercase tracking-[0.08em] text-accent-foreground transition-colors hover:bg-accent/90"
              >
                <Icon name="FolderPlus" size={14} />
                Новая папка
              </button>
            }
          >
            {list.length === 0 ? (
              <Empty
                icon="FolderOpen"
                title={loading ? 'Загрузка…' : 'Папок пока нет'}
                hint="Создайте папку с названием документа."
              />
            ) : (
              list.map((f) => {
                const local = localByFolder.get(f.id)?.length ?? 0;
                return (
                  <div
                    key={f.id}
                    className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0"
                  >
                    <span
                      className={cn(
                        'flex h-9 w-9 flex-none items-center justify-center rounded-sm',
                        f.photos.length + local
                          ? 'bg-accent text-accent-foreground'
                          : 'bg-secondary text-muted-foreground',
                      )}
                    >
                      <Icon name="Folder" size={17} />
                    </span>
                    <button type="button" onClick={() => setOpen(f)} className="min-w-0 flex-1 text-left">
                      <span className="block truncate font-head text-[0.95em] uppercase tracking-[0.02em]">
                        {f.title}
                      </span>
                      <span className="block truncate text-[0.76em] text-muted-foreground">
                        {f.photos.length + local} фото ·{' '}
                        {new Date(f.createdAt).toLocaleDateString('ru')}
                        {local ? ` · ${local} в очереди` : ''}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(f.id)}
                      className="flex h-8 w-8 flex-none items-center justify-center rounded-sm bg-secondary transition-colors hover:bg-destructive hover:text-destructive-foreground"
                    >
                      <Icon name="X" size={15} />
                    </button>
                  </div>
                );
              })
            )}
          </Panel>
        )}
      </div>

      <input
        ref={camRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        hidden
        onChange={(e) => shoot(e.target.files)}
      />

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="max-w-sm rounded-sm">
          <DialogHeader>
            <DialogTitle className="font-head text-[1.15em] uppercase tracking-[0.03em]">
              Новая папка
            </DialogTitle>
            <DialogDescription className="text-[0.85em]">
              {subLabel ?? SECTION_TITLE[section]}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <Label className="text-[0.7em] uppercase tracking-[0.1em] text-muted-foreground">
              Название документа
            </Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addFolder()}
              placeholder="Например: Акт испытания трубопровода"
              className="h-9 rounded-sm"
            />
          </div>

          <Button
            onClick={addFolder}
            disabled={busy}
            className="gap-2 rounded-sm bg-accent font-head uppercase tracking-[0.06em] text-accent-foreground hover:bg-accent/90"
          >
            <Icon name={busy ? 'Loader2' : 'FolderPlus'} size={16} className={busy ? 'animate-spin' : ''} />
            Создать
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FoldersCabinet;