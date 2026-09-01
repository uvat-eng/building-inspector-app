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
import { useObjects } from '@/data/store';
import { useProfile } from '@/data/profile';
import { useAllDocuments } from '@/data/allDocuments';
import { DocSection, SECTION_LABEL, SECTION_ICON, fmtSize, ProjectDoc } from '@/data/documents';

const SECTIONS: DocSection[] = ['contract', 'project', 'working', 'masterplan'];

const SHORT: Record<DocSection, string> = {
  contract: 'Договор',
  project: 'Проектная',
  working: 'Рабочая',
  masterplan: 'Генплан',
  pos: 'ПОС',
  ppr: 'ППР',
};

interface ManagerCabinetProps {
  onExit?: () => void;
}

const ManagerCabinet = ({ onExit }: ManagerCabinetProps) => {
  const { profile } = useProfile();
  const { toast } = useToast();
  const { list: objects } = useObjects();
  const { items, loading, progress, uploadMany, remove } = useAllDocuments();

  const [openObject, setOpenObject] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [section, setSection] = useState<DocSection>('project');
  const [target, setTarget] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const byObject = useMemo(() => {
    const map = new Map<string, ProjectDoc[]>();
    items.forEach((d) => map.set(d.objectId, [...(map.get(d.objectId) ?? []), d]));
    return map;
  }, [items]);

  const openUpload = (objectId?: string) => {
    setTarget(objectId ? [objectId] : []);
    setSection('project');
    setNote('');
    setUploadOpen(true);
  };

  const toggleTarget = (id: string) =>
    setTarget((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const doUpload = async () => {
    const files = Array.from(fileRef.current?.files ?? []);
    if (!files.length) {
      toast({ title: 'Выберите файлы', variant: 'destructive' });
      return;
    }
    if (!target.length) {
      toast({ title: 'Выберите хотя бы один объект', variant: 'destructive' });
      return;
    }
    if (section === 'contract' && files.some((f) => !/\.pdf$/i.test(f.name))) {
      toast({ title: 'Договор загружается только в PDF', variant: 'destructive' });
      return;
    }
    const big = files.find((f) => f.size > 25 * 1024 * 1024);
    if (big) {
      toast({ title: `Файл «${big.name}» больше 25 МБ`, variant: 'destructive' });
      return;
    }

    const tasks = target.flatMap((objectId) =>
      files.map((file) => ({ file, objectId, section, note, by: profile.fio })),
    );
    const { ok, failed } = await uploadMany(tasks);
    toast({
      title: failed ? `Загружено ${ok}, ошибок ${failed}` : `Загружено ${ok} документов`,
      description: `${SECTION_LABEL[section]} · объектов: ${target.length}`,
      variant: failed ? 'destructive' : undefined,
    });
    setUploadOpen(false);
  };

  const active = objects.find((o) => o.id === openObject);
  const activeDocs = active ? (byObject.get(active.id) ?? []) : [];

  const docRow = (d: ProjectDoc, showObject = false) => (
    <div key={d.id} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0">
      <span className="flex h-9 w-9 flex-none items-center justify-center rounded-sm bg-secondary text-muted-foreground">
        <Icon name={SECTION_ICON[d.section]} fallback="File" size={17} />
      </span>
      <button
        type="button"
        onClick={() => window.open(d.fileUrl, '_blank')}
        className="min-w-0 flex-1 text-left"
      >
        <span className="block truncate font-head text-[0.95em] uppercase tracking-[0.02em]">
          {d.title}
        </span>
        <span className="block truncate text-[0.76em] text-muted-foreground">
          {showObject ? `${objects.find((o) => o.id === d.objectId)?.title ?? '—'} · ` : ''}
          {SECTION_LABEL[d.section]} · {fmtSize(d.fileSize)} ·{' '}
          {new Date(d.createdAt).toLocaleDateString('ru')}
        </span>
      </button>
      <button
        type="button"
        title="Удалить"
        onClick={() => {
          remove(d.id);
          toast({ title: 'Документ удалён' });
        }}
        className="flex h-8 w-8 flex-none items-center justify-center rounded-sm bg-secondary transition-colors hover:bg-destructive hover:text-destructive-foreground"
      >
        <Icon name="X" size={15} />
      </button>
    </div>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2.5">
      <div className="flex flex-none flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 text-[0.82em] uppercase tracking-[0.08em]">
          <button
            type="button"
            onClick={() => setOpenObject(null)}
            className="flex items-center gap-1.5 rounded-sm px-2 py-1 transition-colors hover:bg-secondary"
          >
            <Icon name="FileSignature" size={14} className="text-accent" />
            Кабинет менеджера
          </button>
          {active && (
            <>
              <Icon name="ChevronRight" size={13} className="text-muted-foreground/50" />
              <span className="max-w-[220px] truncate font-head tracking-[0.1em] text-muted-foreground">
                {active.title}
              </span>
            </>
          )}
        </span>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => openUpload(active?.id)}
            className="flex items-center gap-1.5 rounded-sm bg-accent px-2.5 py-1 text-[0.78em] uppercase tracking-[0.08em] text-accent-foreground transition-colors hover:bg-accent/90"
          >
            <Icon name="Upload" size={14} />
            Загрузить документы
          </button>
          {onExit && (
            <button
              type="button"
              onClick={onExit}
              className="flex items-center gap-1.5 rounded-sm border border-border bg-card px-2.5 py-1 text-[0.78em] uppercase tracking-[0.08em] transition-colors hover:border-destructive hover:text-destructive"
            >
              <Icon name="LogOut" size={14} />
              Выйти
            </button>
          )}
        </div>
      </div>

      <div className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
        {!active ? (
          <>
            <section className="flex-none rounded-sm border border-border border-t-2 border-t-accent bg-card px-4 py-4 sm:px-6 sm:py-5">
              <h1 className="font-head text-[19px] uppercase leading-[1.15] tracking-[0.02em] sm:text-[28px]">
                Менеджер <span className="text-accent">проекта</span>
              </h1>
              <p className="mt-2 text-[0.88em] text-muted-foreground">
                {profile.fio || 'ФИО не указано'} · {profile.org}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-px border-t border-border bg-border pt-px sm:grid-cols-4">
                {[
                  { icon: 'Building2', label: 'Объектов', value: objects.length },
                  { icon: 'FileStack', label: 'Документов', value: items.length },
                  {
                    icon: 'FileText',
                    label: 'Проектная',
                    value: items.filter((d) => d.section === 'project').length,
                  },
                  {
                    icon: 'FileBadge',
                    label: 'Договоров',
                    value: items.filter((d) => d.section === 'contract').length,
                  },
                ].map((s) => (
                  <div key={s.label} className="bg-card px-3 py-3">
                    <Icon name={s.icon} fallback="File" size={16} className="text-accent" />
                    <p className="mt-1.5 font-head text-[1.4em] leading-none">{s.value}</p>
                    <p className="mt-1 text-[0.72em] uppercase tracking-[0.1em] text-muted-foreground">
                      {s.label}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <Panel title="Документация по объектам" note={`${objects.length} объектов`}>
              {objects.length === 0 ? (
                <Empty icon="Building2" title="Объектов нет" hint="Сначала добавьте объект." />
              ) : (
                objects.map((o) => {
                  const docs = byObject.get(o.id) ?? [];
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => setOpenObject(o.id)}
                      className="group flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-foreground hover:text-background"
                    >
                      <span
                        className={cn(
                          'flex h-9 w-9 flex-none items-center justify-center rounded-sm',
                          docs.length ? 'bg-accent text-accent-foreground' : 'bg-secondary text-muted-foreground',
                        )}
                      >
                        <Icon name="FolderOpen" size={17} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-head text-[0.95em] uppercase tracking-[0.02em]">
                          {o.title}
                        </span>
                        <span className="block truncate text-[0.76em] text-muted-foreground group-hover:text-background/70">
                          {o.regionName} ·{' '}
                          {loading
                            ? 'загрузка…'
                            : docs.length
                              ? `${docs.length} документов`
                              : 'документов нет'}
                        </span>
                      </span>
                      <Icon name="ChevronRight" size={18} className="flex-none opacity-40" />
                    </button>
                  );
                })
              )}
            </Panel>
          </>
        ) : (
          SECTIONS.map((s) => {
            const docs = activeDocs.filter((d) => d.section === s);
            return (
              <Panel
                key={s}
                title={SECTION_LABEL[s]}
                note={`${docs.length}`}
                action={
                  <button
                    type="button"
                    onClick={() => {
                      setTarget([active.id]);
                      setSection(s);
                      setNote('');
                      setUploadOpen(true);
                    }}
                    className="ml-3 flex items-center gap-1.5 rounded-sm bg-accent px-2.5 py-1 text-[0.78em] uppercase tracking-[0.08em] text-accent-foreground transition-colors hover:bg-accent/90"
                  >
                    <Icon name="Plus" size={14} />
                    Добавить
                  </button>
                }
              >
                {docs.length === 0 ? (
                  <Empty icon={SECTION_ICON[s]} title="Пусто" hint="Загрузите документы раздела." />
                ) : (
                  docs.map((d) => docRow(d))
                )}
              </Panel>
            );
          })
        )}
      </div>

      <Dialog open={uploadOpen} onOpenChange={(v) => !progress && setUploadOpen(v)}>
        <DialogContent className="max-w-lg rounded-sm">
          <DialogHeader>
            <DialogTitle className="font-head text-[1.2em] uppercase tracking-[0.03em]">
              Загрузка документации
            </DialogTitle>
            <DialogDescription className="text-[0.85em]">
              Можно выбрать несколько файлов и несколько объектов сразу.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-[0.7em] uppercase tracking-[0.1em] text-muted-foreground">
                Раздел
              </Label>
              <div className="grid grid-cols-4 gap-px bg-border">
                {SECTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSection(s)}
                    className={cn(
                      'flex flex-col items-center gap-1 px-2 py-2.5 text-[0.72em] uppercase tracking-[0.06em] transition-colors',
                      section === s
                        ? 'bg-accent text-accent-foreground'
                        : 'bg-card hover:bg-secondary',
                    )}
                  >
                    <Icon name={SECTION_ICON[s]} fallback="File" size={16} />
                    {SHORT[s]}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[0.7em] uppercase tracking-[0.1em] text-muted-foreground">
                Объекты · выбрано {target.length}
              </Label>
              <div className="scrollbar-thin max-h-40 overflow-y-auto rounded-sm border border-border">
                {objects.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => toggleTarget(o.id)}
                    className="flex w-full items-center gap-2 border-b border-border px-3 py-2 text-left text-[0.85em] transition-colors last:border-b-0 hover:bg-secondary"
                  >
                    <span
                      className={cn(
                        'flex h-4 w-4 flex-none items-center justify-center rounded-[2px] border',
                        target.includes(o.id)
                          ? 'border-accent bg-accent text-accent-foreground'
                          : 'border-border',
                      )}
                    >
                      {target.includes(o.id) && <Icon name="Check" size={11} />}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{o.title}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[0.7em] uppercase tracking-[0.1em] text-muted-foreground">
                {section === 'contract' ? 'Файлы PDF (до 25 МБ)' : 'Файлы (до 25 МБ каждый)'}
              </Label>
              <Input
                ref={fileRef}
                type="file"
                multiple
                accept={section === 'contract' ? 'application/pdf,.pdf' : undefined}
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
            disabled={!!progress}
            className="gap-2 rounded-sm bg-accent font-head uppercase tracking-[0.06em] text-accent-foreground hover:bg-accent/90"
          >
            <Icon
              name={progress ? 'Loader2' : 'Upload'}
              size={16}
              className={progress ? 'animate-spin' : ''}
            />
            {progress ? `Загружаем ${progress.done} из ${progress.total}…` : 'Загрузить'}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManagerCabinet;