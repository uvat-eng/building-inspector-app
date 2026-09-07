import { useMemo, useState } from 'react';
import Panel from '@/components/desk/Panel';
import Empty from '@/components/desk/Empty';
import Icon from '@/components/ui/icon';
import Tag from '@/components/desk/Tag';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useProfile } from '@/data/profile';
import { useObjects } from '@/data/store';
import DocUploadForm, { UploadMeta } from '@/components/desk/objectdocs/DocUploadForm';
import {
  CARD_SUMMARY_FIELDS,
  DocSection,
  ObjectDoc,
  SECTION_INFO,
  groupDocs,
  useObjectDocs,
} from '@/data/objectdocs';

interface ObjectDocsCabinetProps {
  section: DocSection;
  onBack?: () => void;
}

const ruDate = (v?: string) => {
  if (!v) return '';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString('ru');
};

const toneFor = (status: string) =>
  status === 'актуально' ? 'ok' : status === 'на проверке' ? 'wait' : 'dim';

const ObjectDocsCabinet = ({ section, onBack }: ObjectDocsCabinetProps) => {
  const { toast } = useToast();
  const { profile } = useProfile();
  const { list: objects } = useObjects();
  const { items, loading, upload, update, remove } = useObjectDocs(section);

  const [groupBy, setGroupBy] = useState<'object' | 'contractor'>('object');
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [form, setForm] = useState(false);
  const [edit, setEdit] = useState<ObjectDoc | null>(null);

  const info = SECTION_INFO[section];

  const contractors = useMemo(
    () => [...new Set(items.map((d) => d.contractor).filter(Boolean))].sort(),
    [items],
  );

  const groups = useMemo(() => groupDocs(items, groupBy), [items, groupBy]);

  const counters = [
    { icon: 'FileStack', label: 'Документов', value: items.length },
    { icon: 'Building2', label: 'Объектов', value: groupDocs(items, 'object').length },
    { icon: 'HardHat', label: 'Подрядчиков', value: contractors.length },
    {
      icon: 'CircleCheck',
      label: 'Актуальных',
      value: items.filter((d) => d.status === 'актуально').length,
    },
  ];

  const doUpload = async (file: File, meta: UploadMeta) => {
    try {
      await upload(file, {
        ...meta,
        section,
        fileName: file.name,
        uploadedBy: profile.fio,
      });
      setOpenKey(groupBy === 'object' ? meta.objectTitle : meta.contractor);
      toast({ title: 'Документ загружен', description: meta.objectTitle });
    } catch {
      toast({ title: 'Не удалось загрузить', variant: 'destructive' });
    }
  };

  const doSave = async (meta: UploadMeta) => {
    if (!edit) return;
    try {
      await update(edit.id, meta);
      toast({ title: 'Карточка обновлена' });
    } catch {
      toast({ title: 'Не удалось сохранить', variant: 'destructive' });
    }
  };

  return (
    <div className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="flex w-fit flex-none items-center gap-1.5 rounded-sm border border-border bg-card px-2.5 py-1 text-[0.78em] uppercase tracking-[0.08em] transition-colors hover:border-accent hover:bg-secondary"
        >
          <Icon name="ArrowLeft" size={14} className="text-accent" />
          К обзору
        </button>
      )}

      <section className="flex-none rounded-sm border border-border border-t-2 border-t-accent bg-card px-4 py-4">
        <h1 className="font-head text-[1.05em] uppercase leading-tight tracking-[0.03em]">
          {info.title}
        </h1>
        <p className="mt-1 text-[0.85em] text-muted-foreground">{info.note}</p>

        <p className="mt-3 flex items-start gap-2 rounded-sm bg-accent/10 px-3 py-2.5 text-[0.86em] leading-snug">
          <Icon name="Info" size={16} className="mt-0.5 flex-none text-accent" />
          <span>{info.hint}</span>
        </p>

        {section === 'card' && (
          <p className="mt-2 text-[0.8em] leading-snug text-muted-foreground">
            Сводка из карточки видна в разделе объекта — её открывают все участники: от директора
            до механика.
          </p>
        )}
      </section>

      <div className="grid flex-none gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {counters.map((c) => (
          <div
            key={c.label}
            className="flex items-center gap-3 rounded-sm border border-border bg-card px-4 py-3.5"
          >
            <span className="flex h-10 w-10 flex-none items-center justify-center rounded-sm bg-secondary text-accent">
              <Icon name={c.icon} fallback="Circle" size={19} />
            </span>
            <span className="min-w-0">
              <span className="block font-head text-[22px] leading-none">{c.value}</span>
              <span className="mt-1 block truncate text-[0.74em] uppercase tracking-[0.08em] text-muted-foreground">
                {c.label}
              </span>
            </span>
          </div>
        ))}
      </div>

      <div className="flex flex-none flex-wrap gap-2">
        <Button
          onClick={() => {
            setEdit(null);
            setForm(true);
          }}
          className="flex-1 gap-2 rounded-sm bg-accent font-head text-[0.85em] uppercase tracking-[0.06em] text-accent-foreground hover:bg-accent/90"
        >
          <Icon name={section === 'geodesy' ? 'Camera' : 'Upload'} size={16} />
          Загрузить документ
        </Button>
        <Button
          onClick={() => setGroupBy((p) => (p === 'object' ? 'contractor' : 'object'))}
          variant="outline"
          className="flex-1 gap-2 rounded-sm font-head text-[0.85em] uppercase tracking-[0.06em]"
        >
          <Icon name="ArrowLeftRight" size={16} className="text-accent" />
          {groupBy === 'object' ? 'По подрядчикам' : 'По объектам'}
        </Button>
      </div>

      <Panel
        title={groupBy === 'object' ? 'Папки по объектам' : 'Папки по подрядчикам'}
        note={`${groups.length}`}
      >
        {loading ? (
          <p className="flex items-center gap-2 p-4 text-[0.85em] text-muted-foreground">
            <Icon name="Loader2" size={15} className="animate-spin" />
            Загружаем документы…
          </p>
        ) : groups.length === 0 ? (
          <Empty
            icon={info.icon}
            title="Документов нет"
            hint="Нажмите «Загрузить документ» — файл сохранится в папке объекта."
          />
        ) : (
          groups.map((g) => (
            <div key={g.title} className="border-b border-border last:border-b-0">
              <button
                type="button"
                onClick={() => setOpenKey((p) => (p === g.title ? null : g.title))}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/60"
              >
                <Icon
                  name={openKey === g.title ? 'FolderOpen' : 'Folder'}
                  size={18}
                  className="flex-none text-accent"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-head text-[0.92em] uppercase tracking-[0.03em]">
                    {g.title}
                  </span>
                  <span className="block truncate text-[0.76em] text-muted-foreground">
                    {g.docs.length} документов · актуальных{' '}
                    {g.docs.filter((d) => d.status === 'актуально').length}
                  </span>
                </span>
                <Icon
                  name={openKey === g.title ? 'ChevronDown' : 'ChevronRight'}
                  size={16}
                  className="flex-none text-muted-foreground"
                />
              </button>

              {openKey === g.title &&
                g.docs.map((d) => (
                  <div
                    key={d.id}
                    className="border-t border-border/50 px-4 py-3 pl-8 text-[0.9em]"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 flex-none items-center justify-center rounded-sm bg-secondary text-accent">
                        <Icon
                          name={d.mime.startsWith('image') ? 'Image' : 'FileSpreadsheet'}
                          size={16}
                        />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">
                          {d.title || d.fileName}
                          {d.version > 1 ? ` · ред. ${d.version}` : ''}
                        </span>
                        <span className="block truncate text-[0.8em] text-muted-foreground">
                          {groupBy === 'object' ? d.contractor || '—' : d.objectTitle || '—'}
                          {d.docNumber ? ` · ${d.docNumber}` : ''}
                          {d.docDate ? ` · ${ruDate(d.docDate)}` : ''}
                          {d.period ? ` · ${d.period}` : ''} · {d.sizeKb} КБ · {d.uploadedBy}
                        </span>
                      </span>
                      <Tag tone={toneFor(d.status)}>{d.status}</Tag>
                      <a
                        href={d.url}
                        target="_blank"
                        rel="noreferrer"
                        title="Открыть"
                        className="flex h-8 w-8 flex-none items-center justify-center rounded-sm bg-secondary transition-colors hover:bg-border"
                      >
                        <Icon name="Download" size={14} />
                      </a>
                      <button
                        type="button"
                        title="Редактировать"
                        onClick={() => {
                          setEdit(d);
                          setForm(true);
                        }}
                        className="flex h-8 w-8 flex-none items-center justify-center rounded-sm bg-secondary transition-colors hover:bg-border"
                      >
                        <Icon name="Pencil" size={14} />
                      </button>
                      <button
                        type="button"
                        title="Удалить"
                        onClick={() => remove(d.id)}
                        className="flex h-8 w-8 flex-none items-center justify-center rounded-sm bg-secondary text-muted-foreground transition-colors hover:bg-border hover:text-destructive"
                      >
                        <Icon name="Trash2" size={14} />
                      </button>
                    </div>

                    {section === 'card' && Object.keys(d.summary ?? {}).length > 0 && (
                      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 pl-12 text-[0.8em] sm:grid-cols-4">
                        {CARD_SUMMARY_FIELDS.filter((f) => d.summary[f.key]).map((f) => (
                          <span key={f.key} className="flex justify-between gap-2">
                            <span className="truncate text-muted-foreground">{f.label}</span>
                            <span className="font-head">{d.summary[f.key]}</span>
                          </span>
                        ))}
                      </div>
                    )}

                    {d.note && (
                      <p className="mt-1.5 pl-12 text-[0.8em] text-muted-foreground">{d.note}</p>
                    )}
                  </div>
                ))}
            </div>
          ))
        )}
      </Panel>

      <DocUploadForm
        open={form}
        section={section}
        objects={objects.map((o) => ({ id: o.id, title: o.title }))}
        contractors={contractors}
        edit={edit}
        onClose={() => {
          setForm(false);
          setEdit(null);
        }}
        onUpload={doUpload}
        onSave={doSave}
      />
    </div>
  );
};

export default ObjectDocsCabinet;
