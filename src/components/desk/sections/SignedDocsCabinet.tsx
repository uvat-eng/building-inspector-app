import { useMemo, useRef, useState } from 'react';
import Panel from '@/components/desk/Panel';
import Empty from '@/components/desk/Empty';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ProjectObject } from '@/data/store';
import { useProfile } from '@/data/profile';
import { compressPhoto } from '@/data/photoQueue';
import {
  SECTION_META,
  SignedSection,
  monthsOfYear,
  periodLabel,
  useSignedDocs,
} from '@/data/signed';

interface Props {
  object: ProjectObject;
  section: SignedSection;
  onBack: () => void;
}

const fileToBase64 = (file: File) => {
  if (file.type.startsWith('image/')) return compressPhoto(file);
  return new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
};

const SignedDocsCabinet = ({ object, section, onBack }: Props) => {
  const { toast } = useToast();
  const { profile } = useProfile();
  const meta = SECTION_META[section];
  const { items, loading, upload, remove } = useSignedDocs(object.id, section);

  const [year, setYear] = useState(new Date().getFullYear());
  const [openPeriod, setOpenPeriod] = useState<string | null>(
    meta.byMonth ? null : 'manual',
  );
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const byPeriod = useMemo(() => {
    const map = new Map<string, number>();
    items.forEach((d) => map.set(d.period, (map.get(d.period) ?? 0) + 1));
    return map;
  }, [items]);

  const visible = openPeriod
    ? items.filter((d) => (meta.byMonth ? d.period === openPeriod : true))
    : [];

  const years = useMemo(() => {
    const set = new Set<number>([new Date().getFullYear()]);
    items.forEach((d) => {
      const y = Number(d.period.split('-')[0]);
      if (y) set.add(y);
    });
    return [...set].sort((a, b) => b - a);
  }, [items]);

  const pick = async (files: FileList | null) => {
    if (!files?.length || !openPeriod) return;
    setBusy(true);
    let ok = 0;
    for (const file of Array.from(files)) {
      try {
        const content = await fileToBase64(file);
        await upload({
          period: meta.byMonth ? openPeriod : 'manual',
          content,
          fileName: file.name,
          mime: file.type || 'image/jpeg',
          uploadedBy: profile.fio,
        });
        ok += 1;
      } catch {
        /* пропускаем битый файл */
      }
    }
    setBusy(false);
    if (fileRef.current) fileRef.current.value = '';
    toast({
      title: ok ? `Загружено: ${ok}` : 'Не удалось загрузить',
      description: ok ? 'Документы сохранены в системе' : 'Проверьте связь и попробуйте снова',
      variant: ok ? undefined : 'destructive',
    });
  };

  const header = (
    <section className="flex-none rounded-sm border border-border border-t-2 border-t-accent bg-card px-4 py-4">
      <p className="text-[0.72em] uppercase tracking-[0.14em] text-muted-foreground">
        {object.title}
      </p>
      <h1 className="mt-1 font-head text-[17px] uppercase leading-[1.15] tracking-[0.02em] sm:text-[22px]">
        {meta.label}
      </h1>
      <p className="mt-1.5 text-[0.82em] text-muted-foreground">{meta.hint}</p>
    </section>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2.5">
      <button
        type="button"
        onClick={() => (openPeriod && meta.byMonth ? setOpenPeriod(null) : onBack())}
        className="flex w-fit flex-none items-center gap-1.5 rounded-sm border border-border bg-card px-2.5 py-1 text-[0.78em] uppercase tracking-[0.08em] transition-colors hover:border-accent hover:bg-secondary"
      >
        <Icon name="ArrowLeft" size={14} className="text-accent" />
        {openPeriod && meta.byMonth ? 'К папкам месяцев' : 'К меню объекта'}
      </button>

      <div className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
        {header}

        {meta.byMonth && !openPeriod && (
          <Panel
            title={`Папки по месяцам · ${year}`}
            note={`${items.length} документов`}
            action={
              years.length > 1 || year !== new Date().getFullYear() ? (
                <span className="ml-3 flex items-center gap-1">
                  {years.map((y) => (
                    <button
                      key={y}
                      type="button"
                      onClick={() => setYear(y)}
                      className={
                        y === year
                          ? 'rounded-sm bg-accent px-2 py-0.5 text-[0.74em] text-accent-foreground'
                          : 'rounded-sm border border-border px-2 py-0.5 text-[0.74em] text-muted-foreground hover:border-accent'
                      }
                    >
                      {y}
                    </button>
                  ))}
                </span>
              ) : undefined
            }
          >
            <div className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-3">
              {monthsOfYear(year).map((p) => {
                const count = byPeriod.get(p) ?? 0;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setOpenPeriod(p)}
                    className="group flex items-center gap-3 bg-card px-4 py-3.5 text-left transition-colors hover:bg-foreground hover:text-background"
                  >
                    <span className="flex h-10 w-10 flex-none items-center justify-center rounded-sm bg-accent text-accent-foreground">
                      <Icon name={count ? 'FolderCheck' : 'Folder'} size={19} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-head text-[0.95em] uppercase tracking-[0.03em]">
                        {periodLabel(p)}
                      </span>
                      <span className="block truncate text-[0.76em] text-muted-foreground group-hover:text-background/70">
                        {count ? `документов: ${count}` : 'пусто'}
                      </span>
                    </span>
                    <Icon name="ChevronRight" size={18} className="flex-none opacity-40" />
                  </button>
                );
              })}
            </div>
          </Panel>
        )}

        {openPeriod && (
          <>
            <Panel
              title={meta.byMonth ? periodLabel(openPeriod) : 'Загруженные документы'}
              note={`${visible.length}`}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2 px-4 py-6 text-muted-foreground">
                  <Icon name="Loader2" size={16} className="animate-spin" />
                  Загрузка…
                </div>
              ) : visible.length === 0 ? (
                <Empty
                  icon={meta.icon}
                  title="Документов пока нет"
                  hint={meta.hint}
                />
              ) : (
                <div className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-3">
                  {visible.map((d) => (
                    <div key={d.id} className="flex flex-col gap-2 bg-card p-2.5">
                      <button
                        type="button"
                        onClick={() => window.open(d.fileUrl, '_blank')}
                        className="relative aspect-[4/3] overflow-hidden rounded-sm border border-border bg-secondary"
                      >
                        {d.mime.startsWith('image/') ? (
                          <img
                            src={d.fileUrl}
                            alt={d.fileName}
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center">
                            <Icon name="FileText" size={30} className="text-muted-foreground" />
                          </span>
                        )}
                      </button>
                      <div className="flex items-center gap-1.5">
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[0.78em]">{d.fileName}</span>
                          <span className="block truncate text-[0.7em] text-muted-foreground">
                            {new Date(d.createdAt).toLocaleDateString('ru')}
                            {d.uploadedBy ? ` · ${d.uploadedBy}` : ''}
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() => remove(d.id)}
                          className="flex h-7 w-7 flex-none items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-destructive hover:text-destructive-foreground"
                        >
                          <Icon name="Trash2" size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            <input
              ref={fileRef}
              type="file"
              accept={meta.byMonth ? 'image/*,application/pdf' : 'application/pdf,image/*'}
              multiple
              capture={meta.byMonth ? 'environment' : undefined}
              onChange={(e) => pick(e.target.files)}
              className="hidden"
            />

            <div className="flex flex-none flex-col gap-2 sm:flex-row">
              <Button
                onClick={() => fileRef.current?.click()}
                disabled={busy}
                className="flex-1 gap-2 rounded-sm bg-accent font-head uppercase tracking-[0.06em] text-accent-foreground hover:bg-accent/90"
              >
                <Icon
                  name={busy ? 'Loader2' : meta.byMonth ? 'Camera' : 'Upload'}
                  size={16}
                  className={busy ? 'animate-spin' : ''}
                />
                {meta.byMonth ? 'Сфотографировать документ' : 'Загрузить скан документа'}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SignedDocsCabinet;