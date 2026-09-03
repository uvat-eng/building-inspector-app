import { useMemo, useState } from 'react';
import Panel from '@/components/desk/Panel';
import Icon from '@/components/ui/icon';
import Empty from '@/components/desk/Empty';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useProfile } from '@/data/profile';
import { useObjects } from '@/data/store';
import {
  useAllFolders,
  uploadFolderPhoto,
  monthKey,
  monthLabel,
  PhotoFolder,
} from '@/data/folders';
import PhotoReportForm, { ReportDraft } from '@/components/desk/photos/PhotoReportForm';
import { downloadPhotoReport, printPhotoReport } from '@/lib/photoReportDoc';

const PhotosSection = () => {
  const { toast } = useToast();
  const { profile } = useProfile();
  const { list: objects } = useObjects();
  const { items, loading, create, reload } = useAllFolders('photoreport');

  const [form, setForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [openMonth, setOpenMonth] = useState<string | null>(monthKey());
  const [openFolder, setOpenFolder] = useState<string | null>(null);
  const [zoom, setZoom] = useState<PhotoFolder['photos'][number] | null>(null);

  const byMonth = useMemo(() => {
    const map = new Map<string, PhotoFolder[]>();
    items.forEach((f) => {
      const key = f.month || monthKey(new Date(f.createdAt));
      map.set(key, [...(map.get(key) ?? []), f]);
    });
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [items]);

  const objTitle = (id: string) => objects.find((o) => o.id === id)?.title ?? 'Объект';

  const save = async (draft: ReportDraft) => {
    setBusy(true);
    try {
      const dateRu = new Date(draft.date).toLocaleDateString('ru');
      const folder = await create({
        objectId: draft.objectId,
        title: [dateRu, draft.contractor, draft.place].filter(Boolean).join(' · '),
        note: draft.note,
        createdBy: profile.fio,
        month: monthKey(new Date(draft.date)),
        meta: {
          contractor: draft.contractor,
          project: draft.project,
          place: draft.place,
          date: `${dateRu} г.`,
          periodFrom: draft.periodFrom,
          periodTo: draft.periodTo,
          inspector: profile.fio,
        },
      });

      for (const s of draft.shots) await uploadFolderPhoto(folder.id, s.data, s.caption);

      await reload();
      setForm(false);
      setOpenMonth(monthKey(new Date(draft.date)));
      setOpenFolder(folder.id);
      toast({
        title: 'Фотоотчёт сохранён',
        description: `${draft.shots.length} снимков · папка «${monthLabel(monthKey(new Date(draft.date)))}»`,
      });
    } catch {
      toast({ title: 'Не удалось сохранить фотоотчёт', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const docData = (f: PhotoFolder) => ({
    meta: {
      contractor: f.meta?.contractor ?? '',
      project: f.meta?.project ?? '',
      place: f.meta?.place || objTitle(f.objectId),
      date: f.meta?.date || new Date(f.createdAt).toLocaleDateString('ru'),
      periodFrom: f.meta?.periodFrom,
      periodTo: f.meta?.periodTo,
      inspector: f.meta?.inspector || f.createdBy,
    },
    photos: f.photos,
  });

  if (form) {
    return (
      <PhotoReportForm
        objects={objects}
        inspector={profile.fio}
        busy={busy}
        onBack={() => setForm(false)}
        onSave={save}
      />
    );
  }

  return (
    <div className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
      <Button
        onClick={() => setForm(true)}
        className="h-14 flex-none gap-3 rounded-sm bg-accent font-head text-[1.05em] uppercase tracking-[0.06em] text-accent-foreground hover:bg-accent/90"
      >
        <Icon name="Camera" size={22} />
        Создать фотоотчёт
      </Button>

      <Panel title="Фотоотчёты по месяцам" note={`${items.length}`}>
        {loading ? (
          <p className="flex items-center gap-2 p-4 text-[0.85em] text-muted-foreground">
            <Icon name="Loader2" size={15} className="animate-spin" />
            Загружаем архив…
          </p>
        ) : byMonth.length === 0 ? (
          <Empty
            icon="Camera"
            title="Снимков пока нет"
            hint="Нажмите «Создать фотоотчёт»: заполните шапку, сделайте снимки — отчёт ляжет в папку своего месяца."
          />
        ) : (
          byMonth.map(([month, list]) => (
            <div key={month} className="border-b border-border last:border-b-0">
              <button
                type="button"
                onClick={() => setOpenMonth((p) => (p === month ? null : month))}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/60"
              >
                <Icon
                  name={openMonth === month ? 'FolderOpen' : 'Folder'}
                  size={19}
                  className="flex-none text-accent"
                />
                <span className="min-w-0 flex-1 truncate font-head text-[0.95em] uppercase tracking-[0.04em]">
                  {monthLabel(month)}
                </span>
                <span className="flex-none text-[0.8em] text-muted-foreground">
                  {list.length} отчётов
                </span>
              </button>

              {openMonth === month &&
                list.map((f) => {
                  const isOpen = openFolder === f.id;
                  return (
                    <div key={f.id} className="border-t border-border/60 bg-secondary/20">
                      <button
                        type="button"
                        onClick={() => setOpenFolder((p) => (p === f.id ? null : f.id))}
                        className="flex w-full items-center gap-3 px-4 py-3 pl-8 text-left transition-colors hover:bg-secondary/60"
                      >
                        <Icon
                          name={isOpen ? 'ChevronDown' : 'ChevronRight'}
                          size={16}
                          className="flex-none text-muted-foreground"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[0.95em]">
                            {f.meta?.date || new Date(f.createdAt).toLocaleDateString('ru')} ·{' '}
                            {f.meta?.contractor || objTitle(f.objectId)}
                          </span>
                          <span className="block truncate text-[0.8em] text-muted-foreground">
                            {f.meta?.place || objTitle(f.objectId)}
                            {f.createdBy ? ` · ${f.createdBy}` : ''}
                          </span>
                        </span>
                        <span className="flex flex-none items-center gap-1.5 text-[0.8em] text-muted-foreground">
                          <Icon name="Image" size={14} className="text-accent" />
                          {f.photos.length}
                        </span>
                      </button>

                      {isOpen && (
                        <div className="bg-card px-4 pb-3 pl-8 pt-2">
                          {f.meta?.project && (
                            <p className="mb-2 text-[0.86em] text-muted-foreground">
                              {f.meta.project}
                            </p>
                          )}
                          {f.photos.length === 0 ? (
                            <p className="py-2 text-[0.84em] text-muted-foreground">Снимков нет.</p>
                          ) : (
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                              {f.photos.map((p) => (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => setZoom(p)}
                                  className="overflow-hidden rounded-sm border border-border text-left"
                                >
                                  <img
                                    src={p.url}
                                    alt={p.caption || 'снимок'}
                                    loading="lazy"
                                    className="aspect-[4/3] w-full object-cover transition-transform duration-300 hover:scale-105"
                                  />
                                  <span className="block px-2 py-1.5 text-[0.78em] leading-snug text-muted-foreground">
                                    {p.caption || 'без подписи'}
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}

                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              className="h-9 flex-1 gap-1.5 rounded-sm bg-accent font-head text-[0.82em] uppercase tracking-[0.06em] text-accent-foreground hover:bg-accent/90"
                              onClick={() =>
                                downloadPhotoReport(
                                  docData(f),
                                  `Фотоотчёт ${f.meta?.date || ''}`.trim(),
                                )
                              }
                            >
                              <Icon name="FileDown" size={15} />
                              Скачать в Word
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-9 flex-1 gap-1.5 rounded-sm text-[0.82em] uppercase tracking-[0.06em]"
                              onClick={() => {
                                if (!printPhotoReport(docData(f)))
                                  toast({
                                    title: 'Разрешите всплывающие окна',
                                    variant: 'destructive',
                                  });
                              }}
                            >
                              <Icon name="Printer" size={15} className="text-accent" />
                              Печать
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          ))
        )}
      </Panel>

      <Dialog open={!!zoom} onOpenChange={(v) => !v && setZoom(null)}>
        <DialogContent className="max-w-3xl rounded-sm border-t-2 border-t-accent p-0">
          <DialogTitle className="sr-only">Снимок фотоотчёта</DialogTitle>
          <DialogDescription className="sr-only">
            {zoom?.caption || 'Просмотр фотографии'}
          </DialogDescription>
          {zoom && (
            <>
              <img src={zoom.url} alt="снимок" className="max-h-[74vh] w-full object-contain" />
              {zoom.caption && (
                <p className="px-5 pb-5 text-center text-[0.9em]">{zoom.caption}</p>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PhotosSection;
