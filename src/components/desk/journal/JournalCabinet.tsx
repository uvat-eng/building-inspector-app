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
import JournalEntryDialog from '@/components/desk/journal/JournalEntryDialog';
import JournalSendDialog from '@/components/desk/journal/JournalSendDialog';
import JournalImportDialog from '@/components/desk/journal/JournalImportDialog';
import { downloadJournal } from '@/lib/journalXls';
import { JournalEntry, groupByObject, isFixed, useJournal } from '@/data/journal';

interface JournalCabinetProps {
  onBack?: () => void;
}

const ruDate = (v?: string) => {
  if (!v) return '';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString('ru');
};

const JournalCabinet = ({ onBack }: JournalCabinetProps) => {
  const { toast } = useToast();
  const { profile } = useProfile();
  const { list: objects } = useObjects();

  const canSeeAll = ['engineer', 'manager', 'director', 'admin', 'coordinator', 'pm'].includes(
    profile.role,
  );

  const { items, loading, create, update, remove, importMany } = useJournal(
    canSeeAll ? {} : { authorId: profile.fio },
  );

  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<JournalEntry | null>(null);
  const [sendOpen, setSendOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [who, setWho] = useState<string>('');
  const [openTab, setOpenTab] = useState<string | null>(null);

  const authors = useMemo(
    () => [...new Set(items.map((e) => e.authorFio).filter(Boolean))].sort(),
    [items],
  );

  const shown = useMemo(
    () => (who ? items.filter((e) => e.authorFio === who) : items),
    [items, who],
  );

  const groups = useMemo(() => groupByObject(shown), [shown]);
  const objectNames = useMemo(
    () => [...new Set([...objects.map((o) => o.title), ...items.map((e) => e.objectTitle)])],
    [objects, items],
  );

  const inspectorName = who || profile.fio;
  const openCount = shown.filter((e) => !isFixed(e.fixStatus)).length;

  const usedSources = useMemo(
    () => new Set(items.map((e) => e.sourceId).filter(Boolean) as string[]),
    [items],
  );

  const runImport = async (rows: Partial<JournalEntry>[]) => {
    try {
      const n = await importMany(
        rows.map((r) => ({
          ...r,
          projectTitle: profile.group || 'Обустройство Восточно-Мессояхского месторождения',
        })),
      );
      if (rows[0]?.objectTitle) setOpenTab(rows[0].objectTitle);
      toast({
        title: `Подгружено записей: ${n}`,
        description: 'Проверьте и при необходимости отредактируйте.',
      });
    } catch {
      toast({ title: 'Не удалось подгрузить', variant: 'destructive' });
    }
  };

  const save = async (patch: Partial<JournalEntry>) => {
    if (!patch.objectTitle?.trim()) {
      toast({ title: 'Укажите объект', variant: 'destructive' });
      return;
    }
    if (!patch.content?.trim()) {
      toast({ title: 'Заполните содержание замечания', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      if (editing) {
        await update(editing.id, { ...patch, updatedBy: profile.fio });
        toast({ title: 'Запись обновлена' });
      } else {
        await create({
          ...patch,
          authorId: profile.fio,
          authorFio: profile.fio,
          projectTitle: profile.group || 'Обустройство Восточно-Мессояхского месторождения',
        });
        setOpenTab(patch.objectTitle);
        toast({ title: 'Запись добавлена в журнал' });
      }
      setDialog(false);
      setEditing(null);
    } catch {
      toast({ title: 'Не удалось сохранить', variant: 'destructive' });
    } finally {
      setBusy(false);
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
          Индивидуальный журнал ИСК
        </h1>
        <p className="mt-1 text-[0.85em] text-muted-foreground">
          {inspectorName || 'инспектор не выбран'} · записей {shown.length} · не устранено{' '}
          {openCount}
        </p>

        {canSeeAll && authors.length > 0 && (
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
              Все инспекторы
            </button>
            {authors.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setWho(a)}
                className={cn(
                  'rounded-sm border px-2.5 py-1 text-[0.78em] transition-colors',
                  who === a
                    ? 'border-accent bg-accent text-accent-foreground'
                    : 'border-input hover:bg-secondary',
                )}
              >
                {a}
              </button>
            ))}
          </div>
        )}
      </section>

      <div className="flex flex-none flex-wrap gap-2">
        <Button
          onClick={() => {
            setEditing(null);
            setDialog(true);
          }}
          className="flex-1 gap-2 rounded-sm bg-accent font-head text-[0.85em] uppercase tracking-[0.06em] text-accent-foreground hover:bg-accent/90"
        >
          <Icon name="Plus" size={16} />
          Добавить запись
        </Button>
        <Button
          onClick={() => setImportOpen(true)}
          variant="outline"
          className="flex-1 gap-2 rounded-sm font-head text-[0.85em] uppercase tracking-[0.06em]"
        >
          <Icon name="Download" size={16} className="text-accent" />
          Подгрузить замечания
        </Button>
        <Button
          onClick={() => downloadJournal(shown, inspectorName)}
          variant="outline"
          className="flex-1 gap-2 rounded-sm font-head text-[0.85em] uppercase tracking-[0.06em]"
        >
          <Icon name="FileSpreadsheet" size={16} className="text-accent" />
          Скачать Excel
        </Button>
        <Button
          onClick={() => setSendOpen(true)}
          variant="outline"
          className="flex-1 gap-2 rounded-sm font-head text-[0.85em] uppercase tracking-[0.06em]"
        >
          <Icon name="Send" size={16} className="text-accent" />
          Отправить заказчику
        </Button>
      </div>

      <Panel title="Записи по объектам" note={`${groups.length} вкладок`}>
        {loading ? (
          <p className="flex items-center gap-2 p-4 text-[0.85em] text-muted-foreground">
            <Icon name="Loader2" size={15} className="animate-spin" />
            Загружаем журнал…
          </p>
        ) : groups.length === 0 ? (
          <Empty
            icon="BookText"
            title="Журнал пуст"
            hint="Нажмите «Добавить запись» — форма повторяет бланк журнала замечаний ИСК."
          />
        ) : (
          groups.map((g) => (
            <div key={g.title} className="border-b border-border last:border-b-0">
              <button
                type="button"
                onClick={() => setOpenTab((p) => (p === g.title ? null : g.title))}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/60"
              >
                <Icon
                  name={openTab === g.title ? 'FolderOpen' : 'Folder'}
                  size={18}
                  className="flex-none text-accent"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-head text-[0.92em] uppercase tracking-[0.03em]">
                    {g.title}
                  </span>
                  <span className="block truncate text-[0.76em] text-muted-foreground">
                    {g.items.length} записей · не устранено{' '}
                    {g.items.filter((e) => !isFixed(e.fixStatus)).length}
                  </span>
                </span>
                <Icon
                  name={openTab === g.title ? 'ChevronDown' : 'ChevronRight'}
                  size={16}
                  className="flex-none text-muted-foreground"
                />
              </button>

              {openTab === g.title &&
                g.items.map((e, i) => (
                  <div
                    key={e.id}
                    className="flex items-start gap-3 border-t border-border/50 px-4 py-3 pl-8"
                  >
                    <span className="mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-sm bg-secondary font-head text-[0.72em]">
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[0.9em] leading-snug">{e.content}</span>
                      <span className="mt-0.5 block truncate text-[0.75em] text-muted-foreground">
                        {ruDate(e.date)} · {e.contractor || '—'}
                        {e.category ? ` · ${e.category}` : ''}
                        {e.fixDate ? ` · устранено ${ruDate(e.fixDate)}` : ''}
                        {e.sourceNumber
                          ? ` · из ${e.sourceKind === 'order' ? 'предписания' : 'акта'} № ${
                              e.sourceNumber
                            }`
                          : ''}
                        {canSeeAll ? ` · ${e.authorFio}` : ''}
                      </span>
                    </span>
                    <Tag tone={isFixed(e.fixStatus) ? 'ok' : 'wait'}>{e.fixStatus}</Tag>
                    <button
                      type="button"
                      title="Редактировать"
                      onClick={() => {
                        setEditing(e);
                        setDialog(true);
                      }}
                      className="flex h-8 w-8 flex-none items-center justify-center rounded-sm bg-secondary transition-colors hover:bg-border"
                    >
                      <Icon name="Pencil" size={14} />
                    </button>
                    {(canSeeAll || e.authorFio === profile.fio) && (
                      <button
                        type="button"
                        title="Удалить"
                        onClick={() => {
                          remove(e.id);
                          toast({ title: 'Запись удалена' });
                        }}
                        className="flex h-8 w-8 flex-none items-center justify-center rounded-sm bg-secondary text-muted-foreground transition-colors hover:bg-border hover:text-destructive"
                      >
                        <Icon name="Trash2" size={14} />
                      </button>
                    )}
                  </div>
                ))}
            </div>
          ))
        )}
      </Panel>

      <JournalEntryDialog
        open={dialog}
        entry={editing}
        objects={objectNames}
        inspector={profile.fio}
        busy={busy}
        onClose={() => {
          setDialog(false);
          setEditing(null);
        }}
        onSave={save}
      />

      <JournalImportDialog
        open={importOpen}
        inspector={profile.fio}
        existingSourceIds={usedSources}
        onClose={() => setImportOpen(false)}
        onImport={runImport}
      />

      <JournalSendDialog
        open={sendOpen}
        entries={shown}
        inspector={inspectorName}
        onClose={() => setSendOpen(false)}
      />
    </div>
  );
};

export default JournalCabinet;