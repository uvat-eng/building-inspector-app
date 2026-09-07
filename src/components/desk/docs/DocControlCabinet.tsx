import { useMemo, useState } from 'react';
import Panel from '@/components/desk/Panel';
import Empty from '@/components/desk/Empty';
import Icon from '@/components/ui/icon';
import Tag from '@/components/desk/Tag';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useProfile } from '@/data/profile';
import DocCheckDialog from '@/components/desk/docs/DocCheckDialog';
import DocDefectDialog from '@/components/desk/docs/DocDefectDialog';
import DocUploadDialog from '@/components/desk/docs/DocUploadDialog';
import { downloadDocReport } from '@/lib/docControlXls';
import {
  DocCheck,
  DocDefect,
  contractorStats,
  isDocFixed,
  kindLabel,
  useDocControl,
} from '@/data/doccontrol';

interface DocControlCabinetProps {
  onBack?: () => void;
}

const ruDate = (v?: string) => {
  if (!v) return '';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString('ru');
};

const HINTS = [
  {
    icon: 'ClipboardList',
    title: 'Строки проверки',
    text: 'Раздел проекта, папки, движение по первичной и повторной проверке НТН — лист «ОТЧЕТ».',
  },
  {
    icon: 'BookText',
    title: 'Замечания по документации',
    text: 'Дата, объект, позиция, содержание и статус устранения — лист «Журнал_».',
  },
  {
    icon: 'FolderUp',
    title: 'Файлы подрядчиков',
    text: 'Загруженные отчёты ИТД, журналы и таблицы ПСД учитываются по каждому подрядчику.',
  },
  {
    icon: 'FileSpreadsheet',
    title: 'Выгрузка',
    text: 'Один файл с листами «ОТЧЕТ», «Журнал_», «ПСД подрядчиков» и «Файлы».',
  },
];

const DocControlCabinet = ({ onBack }: DocControlCabinetProps) => {
  const { toast } = useToast();
  const { profile } = useProfile();
  const {
    checks,
    defects,
    files,
    loading,
    addCheck,
    addDefect,
    updateCheck,
    updateDefect,
    uploadFile,
    removeItem,
  } = useDocControl();

  const [tab, setTab] = useState<'summary' | 'checks' | 'defects' | 'files'>('summary');
  const [who, setWho] = useState('');
  const [checkDlg, setCheckDlg] = useState(false);
  const [defectDlg, setDefectDlg] = useState(false);
  const [uploadDlg, setUploadDlg] = useState(false);
  const [editCheck, setEditCheck] = useState<DocCheck | null>(null);
  const [editDefect, setEditDefect] = useState<DocDefect | null>(null);
  const [busy, setBusy] = useState(false);

  const contractors = useMemo(
    () =>
      [
        ...new Set([
          ...checks.map((c) => c.contractor),
          ...defects.map((d) => d.contractor),
          ...files.map((f) => f.contractor),
        ]),
      ]
        .filter(Boolean)
        .sort(),
    [checks, defects, files],
  );

  const fChecks = who ? checks.filter((c) => c.contractor === who) : checks;
  const fDefects = who ? defects.filter((d) => d.contractor === who) : defects;
  const fFiles = who ? files.filter((f) => f.contractor === who) : files;

  const stats = useMemo(
    () => contractorStats(fChecks, fDefects, fFiles),
    [fChecks, fDefects, fFiles],
  );

  const counters = [
    { icon: 'Folders', label: 'Папок в архиве', value: stats.reduce((a, s) => a + s.archived, 0) },
    { icon: 'TriangleAlert', label: 'Замечаний', value: stats.reduce((a, s) => a + s.issued, 0) },
    { icon: 'Clock', label: 'Не устранено', value: fDefects.filter((d) => !isDocFixed(d.fixStatus)).length },
    { icon: 'FileStack', label: 'Файлов', value: fFiles.length },
  ];

  const saveCheck = async (patch: Partial<DocCheck>) => {
    if (!patch.contractor?.trim()) {
      toast({ title: 'Укажите подрядчика', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      if (editCheck) await updateCheck(editCheck.id, patch);
      else await addCheck({ ...patch, authorId: profile.fio, authorFio: profile.fio });
      setCheckDlg(false);
      setEditCheck(null);
      toast({ title: 'Строка сохранена' });
    } catch {
      toast({ title: 'Не удалось сохранить', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const saveDefect = async (patch: Partial<DocDefect>) => {
    if (!patch.content?.trim()) {
      toast({ title: 'Заполните содержание замечания', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      if (editDefect) await updateDefect(editDefect.id, patch);
      else await addDefect({ ...patch, authorId: profile.fio, authorFio: profile.fio });
      setDefectDlg(false);
      setEditDefect(null);
      toast({ title: 'Замечание сохранено' });
    } catch {
      toast({ title: 'Не удалось сохранить', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const upload = async (
    file: File,
    meta: { contractor: string; kind: string; note: string },
  ) => {
    try {
      await uploadFile(file, { ...meta, by: profile.fio });
      setTab('files');
      toast({ title: 'Файл загружен', description: meta.contractor });
    } catch {
      toast({ title: 'Не удалось загрузить файл', variant: 'destructive' });
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
          Отчёт по документации
        </h1>
        <p className="mt-1 text-[0.85em] text-muted-foreground">
          Проверка ИТД и ПСД подрядчиков · учёт загруженных файлов
        </p>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {HINTS.map((h) => (
            <div key={h.title} className="flex gap-2.5 rounded-sm bg-secondary/50 px-3 py-2.5">
              <Icon name={h.icon} fallback="Circle" size={16} className="mt-0.5 flex-none text-accent" />
              <span className="min-w-0">
                <span className="block font-head text-[0.82em] uppercase tracking-[0.03em]">
                  {h.title}
                </span>
                <span className="mt-0.5 block text-[0.78em] leading-snug text-muted-foreground">
                  {h.text}
                </span>
              </span>
            </div>
          ))}
        </div>

        {contractors.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setWho('')}
              className={cn(
                'rounded-sm border px-2.5 py-1 text-[0.78em] transition-colors',
                who === ''
                  ? 'border-accent bg-accent text-accent-foreground'
                  : 'border-input hover:bg-secondary',
              )}
            >
              Все подрядчики
            </button>
            {contractors.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setWho(c)}
                className={cn(
                  'rounded-sm border px-2.5 py-1 text-[0.78em] transition-colors',
                  who === c
                    ? 'border-accent bg-accent text-accent-foreground'
                    : 'border-input hover:bg-secondary',
                )}
              >
                {c}
              </button>
            ))}
          </div>
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
            setEditCheck(null);
            setCheckDlg(true);
          }}
          className="flex-1 gap-2 rounded-sm bg-accent font-head text-[0.85em] uppercase tracking-[0.06em] text-accent-foreground hover:bg-accent/90"
        >
          <Icon name="Plus" size={16} />
          Строка проверки
        </Button>
        <Button
          onClick={() => {
            setEditDefect(null);
            setDefectDlg(true);
          }}
          variant="outline"
          className="flex-1 gap-2 rounded-sm font-head text-[0.85em] uppercase tracking-[0.06em]"
        >
          <Icon name="TriangleAlert" size={16} className="text-accent" />
          Замечание
        </Button>
        <Button
          onClick={() => setUploadDlg(true)}
          variant="outline"
          className="flex-1 gap-2 rounded-sm font-head text-[0.85em] uppercase tracking-[0.06em]"
        >
          <Icon name="Upload" size={16} className="text-accent" />
          Загрузить файл
        </Button>
        <Button
          onClick={() => downloadDocReport(checks, defects, files, who || undefined)}
          variant="outline"
          className="flex-1 gap-2 rounded-sm font-head text-[0.85em] uppercase tracking-[0.06em]"
        >
          <Icon name="FileSpreadsheet" size={16} className="text-accent" />
          Выгрузить Excel
        </Button>
      </div>

      <div className="flex flex-none flex-wrap gap-1">
        {(
          [
            ['summary', `Свод · ${stats.length}`],
            ['checks', `Проверки · ${fChecks.length}`],
            ['defects', `Замечания · ${fDefects.length}`],
            ['files', `Файлы · ${fFiles.length}`],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              'flex-1 rounded-sm px-3 py-2 text-[0.82em] tracking-[0.04em] transition-colors',
              tab === id
                ? 'bg-accent text-accent-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-border',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="flex items-center gap-2 p-4 text-[0.85em] text-muted-foreground">
          <Icon name="Loader2" size={15} className="animate-spin" />
          Загружаем данные…
        </p>
      ) : tab === 'summary' ? (
        <Panel title="Свод по подрядчикам" note="как в таблице проверки ПСД">
          {stats.length === 0 ? (
            <Empty
              icon="ClipboardList"
              title="Данных пока нет"
              hint="Добавьте строку проверки или загрузите файл подрядчика."
            />
          ) : (
            stats.map((s) => (
              <div
                key={s.contractor}
                className="border-b border-border px-4 py-3 last:border-b-0"
              >
                <p className="truncate font-head text-[0.92em] uppercase tracking-[0.03em]">
                  {s.contractor}
                </p>
                <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[0.78em] sm:grid-cols-4">
                  {[
                    ['Планируется папок', s.planned],
                    ['В архиве', s.archived],
                    ['Справок НТН', s.certs],
                    ['На проверке', Math.max(0, s.sent1 - s.back1)],
                    ['Замечаний', s.issued],
                    ['Устранено', s.fixed],
                    ['Не устранено', s.open],
                    ['Файлов', s.files],
                  ].map(([label, value]) => (
                    <span key={String(label)} className="flex justify-between gap-2">
                      <span className="truncate text-muted-foreground">{label}</span>
                      <span className="font-head">{value}</span>
                    </span>
                  ))}
                </div>
              </div>
            ))
          )}
        </Panel>
      ) : tab === 'checks' ? (
        <Panel title="Строки проверки" note={`${fChecks.length}`}>
          {fChecks.length === 0 ? (
            <Empty
              icon="ClipboardList"
              title="Строк нет"
              hint="Каждая строка — раздел проекта или папка документации."
            />
          ) : (
            fChecks.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0"
              >
                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-sm bg-secondary text-muted-foreground">
                  <Icon name="Folders" size={16} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.92em]">{c.section || '—'}</span>
                  <span className="block truncate text-[0.76em] text-muted-foreground">
                    {c.contractor} · {c.folder || 'без папки'} · передано {c.sent1} · возвращено{' '}
                    {c.back1} · замечаний {c.issued1 + c.issued2}
                  </span>
                </span>
                <Tag tone={c.open2 > 0 ? 'wait' : 'ok'}>
                  {c.open2 > 0 ? `${c.open2} открыто` : 'закрыто'}
                </Tag>
                <button
                  type="button"
                  title="Редактировать"
                  onClick={() => {
                    setEditCheck(c);
                    setCheckDlg(true);
                  }}
                  className="flex h-8 w-8 flex-none items-center justify-center rounded-sm bg-secondary transition-colors hover:bg-border"
                >
                  <Icon name="Pencil" size={14} />
                </button>
                <button
                  type="button"
                  title="Удалить"
                  onClick={() => removeItem('check', c.id)}
                  className="flex h-8 w-8 flex-none items-center justify-center rounded-sm bg-secondary text-muted-foreground transition-colors hover:bg-border hover:text-destructive"
                >
                  <Icon name="Trash2" size={14} />
                </button>
              </div>
            ))
          )}
        </Panel>
      ) : tab === 'defects' ? (
        <Panel title="Замечания по документации" note={`${fDefects.length}`}>
          {fDefects.length === 0 ? (
            <Empty
              icon="TriangleAlert"
              title="Замечаний нет"
              hint="Записи попадают в лист «Журнал_» выгрузки."
            />
          ) : (
            fDefects.map((d) => (
              <div
                key={d.id}
                className="flex items-start gap-3 border-b border-border px-4 py-3 last:border-b-0"
              >
                <span className="mt-0.5 flex h-9 w-9 flex-none items-center justify-center rounded-sm bg-secondary text-muted-foreground">
                  <Icon name={isDocFixed(d.fixStatus) ? 'CircleCheck' : 'TriangleAlert'} size={16} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[0.9em] leading-snug">{d.content}</span>
                  <span className="mt-0.5 block truncate text-[0.76em] text-muted-foreground">
                    {ruDate(d.date)} · {d.contractor} · {d.objectTitle || '—'}
                    {d.position ? ` · ${d.position}` : ''}
                    {d.fixDate ? ` · устранено ${ruDate(d.fixDate)}` : ''}
                  </span>
                </span>
                <Tag tone={isDocFixed(d.fixStatus) ? 'ok' : 'wait'}>{d.fixStatus}</Tag>
                <button
                  type="button"
                  title="Редактировать"
                  onClick={() => {
                    setEditDefect(d);
                    setDefectDlg(true);
                  }}
                  className="flex h-8 w-8 flex-none items-center justify-center rounded-sm bg-secondary transition-colors hover:bg-border"
                >
                  <Icon name="Pencil" size={14} />
                </button>
                <button
                  type="button"
                  title="Удалить"
                  onClick={() => removeItem('defect', d.id)}
                  className="flex h-8 w-8 flex-none items-center justify-center rounded-sm bg-secondary text-muted-foreground transition-colors hover:bg-border hover:text-destructive"
                >
                  <Icon name="Trash2" size={14} />
                </button>
              </div>
            ))
          )}
        </Panel>
      ) : (
        <Panel title="Загруженные файлы" note={`${fFiles.length}`}>
          {fFiles.length === 0 ? (
            <Empty
              icon="FolderUp"
              title="Файлов нет"
              hint="Загрузите отчёт ИТД, журнал или таблицу ПСД подрядчика."
            />
          ) : (
            fFiles.map((f) => (
              <div
                key={f.id}
                className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0"
              >
                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-sm bg-secondary text-accent">
                  <Icon name="FileSpreadsheet" size={16} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.92em]">{f.title || f.fileName}</span>
                  <span className="block truncate text-[0.76em] text-muted-foreground">
                    {f.contractor} · {kindLabel(f.kind)} · {f.sizeKb} КБ · {ruDate(f.createdAt)}
                    {f.note ? ` · ${f.note}` : ''}
                  </span>
                </span>
                <a
                  href={f.url}
                  target="_blank"
                  rel="noreferrer"
                  title="Скачать"
                  className="flex h-8 w-8 flex-none items-center justify-center rounded-sm bg-secondary transition-colors hover:bg-border"
                >
                  <Icon name="Download" size={14} />
                </a>
                <button
                  type="button"
                  title="Удалить"
                  onClick={() => removeItem('file', f.id)}
                  className="flex h-8 w-8 flex-none items-center justify-center rounded-sm bg-secondary text-muted-foreground transition-colors hover:bg-border hover:text-destructive"
                >
                  <Icon name="Trash2" size={14} />
                </button>
              </div>
            ))
          )}
        </Panel>
      )}

      <DocCheckDialog
        open={checkDlg}
        check={editCheck}
        contractors={contractors}
        busy={busy}
        onClose={() => {
          setCheckDlg(false);
          setEditCheck(null);
        }}
        onSave={saveCheck}
      />

      <DocDefectDialog
        open={defectDlg}
        defect={editDefect}
        contractors={contractors}
        inspector={profile.fio}
        busy={busy}
        onClose={() => {
          setDefectDlg(false);
          setEditDefect(null);
        }}
        onSave={saveDefect}
      />

      <DocUploadDialog
        open={uploadDlg}
        contractors={contractors}
        onClose={() => setUploadDlg(false)}
        onUpload={upload}
      />
    </div>
  );
};

export default DocControlCabinet;
