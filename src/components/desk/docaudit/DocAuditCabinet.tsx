import { useState } from 'react';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useProfile } from '@/data/profile';
import { useObjects } from '@/data/store';
import {
  analyzeReview,
  AuditFile,
  AuditKind,
  AuditNote,
  createReview,
  DocReview,
  ENGINE_LABEL,
  fmtDate,
  groupByObject,
  loadReview,
  readAllPages,
  removeReview,
  uploadAuditFile,
  useReviews,
} from '@/data/docaudit';
import DropBucket from './DropBucket';
import ActView from './ActView';

interface Props {
  kind: AuditKind;
  onBack?: () => void;
}

const TEXT = {
  project: {
    bucketHint:
      'Загрузите разделы проектной документации — пояснительную записку, ТКР, схемы, ' +
      'спецификации. ИИ проверит их на соответствие нормам и на контролепригодность.',
    working: 'ИИ изучает проектную документацию: сверяет решения с нормами и оценивает контролепригодность',
  },
  executive: {
    bucketHint:
      'Загрузите исполнительную документацию — акты освидетельствования скрытых работ, ' +
      'исполнительные схемы, паспорта и сертификаты, журналы работ. ' +
      'Можно сканы и фото с телефона: текст, подписи и печати распознаёт ИИ.',
    working: 'ИИ проверяет исполнительную документацию: соответствие проекту, нормам и комплектность',
  },
};

const DocAuditCabinet = ({ kind, onBack }: Props) => {
  const { toast } = useToast();
  const { profile } = useProfile();
  const { list: objects } = useObjects();
  const { items, loading, reload } = useReviews(kind);

  const [objectName, setObjectName] = useState('');
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState('');
  const [open, setOpen] = useState<{
    item: DocReview;
    notes: AuditNote[];
    files: AuditFile[];
  } | null>(null);

  const isPd = kind === 'project';

  const openReview = async (id: string) => {
    setBusy(true);
    try {
      setOpen(await loadReview(id));
    } catch {
      toast({ title: 'Не удалось открыть проверку', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const handleFiles = async (files: File[]) => {
    if (!objectName.trim()) {
      toast({
        title: 'Укажите объект',
        description: 'Название объекта нужно для архива проверок.',
        variant: 'destructive',
      });
      return;
    }
    setBusy(true);
    try {
      setStage('Создаём проверку…');
      const id = await createReview({
        kind,
        objectName: objectName.trim(),
        title: title.trim() || files[0]?.name || 'Проверка документации',
        inspector: profile.fio || '',
      });

      for (let i = 0; i < files.length; i += 1) {
        setStage(`Загружаем файл ${i + 1} из ${files.length}: ${files[i].name}`);
        await uploadAuditFile(id, files[i]);
      }

      setStage('Читаем документацию…');
      const { chars } = await readAllPages(id, (s) => {
        const total = s.totalPages || 0;
        const done = s.donePages || 0;
        setStage(
          `${s.method === 'ocr' ? 'Распознаём скан' : 'Читаем'}: лист ${done} из ${total} · ${s.file ?? ''}`,
        );
      });

      if (chars < 200) {
        toast({
          title: 'Не удалось прочитать документацию',
          description:
            'Проверьте качество сканов: текст должен быть различим. ' +
            'Если фото сняты под сильным углом или размыты — переснимите.',
          variant: 'destructive',
        });
        reload();
        return;
      }

      setStage(TEXT[kind].working);
      await analyzeReview(id);
      await openReview(id);
      reload();
      toast({
        title: 'Проверка завершена',
        description: isPd ? 'Сформированы два акта' : 'Сформирован акт проверки',
      });
    } catch (e) {
      toast({
        title: 'Проверка не выполнена',
        description: e instanceof Error ? e.message : 'Неизвестная ошибка',
        variant: 'destructive',
      });
      reload();
    } finally {
      setBusy(false);
      setStage('');
    }
  };

  const drop = async (id: string) => {
    await removeReview(id);
    if (open?.item.id === id) setOpen(null);
    reload();
    toast({ title: 'Проверка удалена из архива' });
  };

  if (open) {
    const { item, notes, files } = open;
    const normNotes = notes.filter((n) => n.scope === 'norms');
    const ctrlNotes = notes.filter((n) => n.scope === 'ctrl');

    return (
      <div className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setOpen(null)}>
            <Icon name="ArrowLeft" size={15} />
            К загрузке
          </Button>
          <span className="text-[0.82em] text-muted-foreground">
            {item.filesCount} файл(ов) · {item.pagesCount} стр.
            {(item.ocrPages ?? 0) > 0 ? ` · распознано со сканов: ${item.ocrPages}` : ''} ·{' '}
            {ENGINE_LABEL[item.engine] || 'ИИ'}
          </span>
        </div>

        {files.length > 0 && (
          <section className="rounded-sm border border-border bg-card px-4 py-3">
            <p className="text-[0.76em] uppercase tracking-[0.1em] text-muted-foreground">
              Проверенные файлы
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {files.map((f) => (
                <a
                  key={f.id}
                  href={f.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 rounded-sm bg-secondary px-2.5 py-1 text-[0.8em] hover:bg-accent hover:text-accent-foreground"
                >
                  <Icon name="FileText" size={13} />
                  {f.name}
                </a>
              ))}
            </div>
          </section>
        )}

        <ActView
          title={isPd ? 'Акт проверки проектной документации' : 'Акт проверки исполнительной документации'}
          subtitle={
            isPd
              ? 'Соответствие требованиям норм и правил проектирования'
              : 'Соответствие требованиям проекта, норм и правил, комплектность'
          }
          review={item}
          notes={normNotes}
          verdict={item.verdict}
          extraNote={isPd ? '' : item.completeNote}
          extraNoteTitle="Комплектность"
        />

        {isPd && (
          <ActView
            title="Акт проверки на контролепригодность"
            subtitle="Возможность контроля всех этапов строительства по данной документации"
            review={item}
            notes={ctrlNotes}
            verdict={item.ctrlVerdict}
            score={item.ctrlScore}
            scoreLabel="Оценка контролепригодности"
          />
        )}
      </div>
    );
  }

  const groups = groupByObject(items);

  return (
    <div className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto">
      <section className="rounded-sm border border-border bg-card px-4 py-3.5 sm:px-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-[0.76em] uppercase tracking-[0.1em] text-muted-foreground">
              Объект
            </span>
            <Input
              list="audit-objects"
              value={objectName}
              onChange={(e) => setObjectName(e.target.value)}
              placeholder="Название объекта"
              className="mt-1"
            />
            <datalist id="audit-objects">
              {objects.map((o) => (
                <option key={o.id} value={o.title} />
              ))}
            </datalist>
          </label>
          <label className="block">
            <span className="text-[0.76em] uppercase tracking-[0.1em] text-muted-foreground">
              Что проверяем
            </span>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isPd ? 'Раздел АР, лист 1-24' : 'АОСР за сентябрь'}
              className="mt-1"
            />
          </label>
        </div>
      </section>

      <DropBucket hint={TEXT[kind].bucketHint} busy={busy} onFiles={handleFiles} />

      {busy && !!stage && (
        <p className="flex items-center justify-center gap-2 rounded-sm bg-secondary/60 px-4 py-3 text-[0.85em]">
          <Icon name="LoaderCircle" size={15} className="animate-spin text-accent" />
          {stage}
        </p>
      )}

      <section>
        <div className="flex items-center gap-2 border-b border-border pb-2">
          <Icon name="Archive" size={16} className="text-accent" />
          <h3 className="font-head text-[0.95em] uppercase tracking-[0.06em]">
            Архив проверенной документации
          </h3>
          <span className="ml-auto text-[0.78em] text-muted-foreground">{items.length}</span>
        </div>

        {loading ? (
          <p className="py-5 text-center text-[0.85em] text-muted-foreground">Загрузка…</p>
        ) : groups.length === 0 ? (
          <p className="py-5 text-center text-[0.85em] text-muted-foreground">
            Архив пуст — загрузите первую документацию.
          </p>
        ) : (
          <div className="mt-2.5 flex flex-col gap-3">
            {groups.map(([obj, list]) => (
              <div key={obj} className="rounded-sm border border-border bg-card">
                <p className="flex items-center gap-2 border-b border-border px-3.5 py-2.5">
                  <Icon name="Building2" size={15} className="flex-none text-accent" />
                  <span className="font-head text-[0.92em] uppercase tracking-[0.04em]">{obj}</span>
                  <span className="ml-auto text-[0.78em] text-muted-foreground">
                    {list.length}
                  </span>
                </p>
                <div className="divide-y divide-border">
                  {list.map((r) => (
                    <div key={r.id} className="flex items-center gap-2.5 px-3.5 py-2.5">
                      <Icon
                        name={r.status === 'done' ? 'FileCheck2' : 'FileWarning'}
                        size={16}
                        className={r.status === 'done' ? 'text-accent' : 'text-destructive'}
                      />
                      <button
                        type="button"
                        onClick={() => openReview(r.id)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <span className="block truncate text-[0.88em]">{r.title}</span>
                        <span className="block truncate text-[0.75em] text-muted-foreground">
                          {fmtDate(r.createdAt)} · {r.filesCount} файл(ов)
                          {r.status === 'error' ? ` · ${r.error.slice(0, 60)}` : ''}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => drop(r.id)}
                        className="flex-none rounded-sm p-1.5 text-muted-foreground hover:bg-destructive hover:text-destructive-foreground"
                        title="Удалить"
                      >
                        <Icon name="Trash2" size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {onBack && (
        <Button variant="outline" size="sm" className="self-start" onClick={onBack}>
          <Icon name="ArrowLeft" size={15} />
          Назад
        </Button>
      )}
    </div>
  );
};

export default DocAuditCabinet;