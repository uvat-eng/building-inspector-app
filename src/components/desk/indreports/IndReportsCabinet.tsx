import { useMemo, useState } from 'react';
import Panel from '@/components/desk/Panel';
import Empty from '@/components/desk/Empty';
import Icon from '@/components/ui/icon';
import Tag from '@/components/desk/Tag';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useObjects } from '@/data/store';
import { useProfile } from '@/data/profile';
import IndReportForm from '@/components/desk/indreports/IndReportForm';
import { downloadIndReport } from '@/lib/indReportDoc';
import { IndReport, KIND_META, groupByDate, useIndReports } from '@/data/indreports';

interface IndReportsCabinetProps {
  onBack?: () => void;
}

const IndReportsCabinet = ({ onBack }: IndReportsCabinetProps) => {
  const { toast } = useToast();
  const { profile } = useProfile();
  const { list: objects } = useObjects();

  const canSeeAll = ['engineer', 'manager', 'director', 'admin', 'coordinator', 'pm'].includes(
    profile.role,
  );
  const authorId = profile.fio;

  const { items, loading, create, update, remove } = useIndReports(
    canSeeAll ? {} : { authorId },
  );

  const [form, setForm] = useState(false);
  const [editing, setEditing] = useState<IndReport | null>(null);
  const [template, setTemplate] = useState<IndReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [openYear, setOpenYear] = useState<string | null>(null);
  const [openMonth, setOpenMonth] = useState<string | null>(null);
  const [openDay, setOpenDay] = useState<string | null>(null);

  const tree = useMemo(() => groupByDate(items), [items]);
  const objTitle = (id: string) => objects.find((o) => o.id === id)?.title ?? 'Объект';

  const save = async (payload: Partial<IndReport>) => {
    setBusy(true);
    try {
      if (editing) {
        await update(editing.id, payload);
        toast({ title: 'Отчёт обновлён' });
      } else {
        const item = await create(payload);
        setOpenYear(item.date.slice(0, 4));
        setOpenMonth(item.date.slice(0, 7));
        setOpenDay(item.date);
        toast({ title: `Отчёт № ${item.number} сохранён` });
      }
      setForm(false);
      setEditing(null);
      setTemplate(null);
    } catch {
      toast({ title: 'Не удалось сохранить отчёт', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  if (form) {
    return (
      <IndReportForm
        objects={objects}
        authorFio={profile.fio}
        authorId={authorId}
        editing={editing}
        template={template}
        busy={busy}
        onBack={() => {
          setForm(false);
          setEditing(null);
          setTemplate(null);
        }}
        onSave={save}
      />
    );
  }

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

      <Button
        onClick={() => {
          setEditing(null);
          setTemplate(null);
          setForm(true);
        }}
        className="h-14 flex-none gap-3 rounded-sm bg-accent font-head text-[1.05em] uppercase tracking-[0.06em] text-accent-foreground hover:bg-accent/90"
      >
        <Icon name="ClipboardPen" size={22} />
        Индивидуальный ежедневный отчёт
      </Button>

      <Panel
        title={canSeeAll ? 'Отчёты всех инспекторов' : 'Мои отчёты'}
        note={`${items.length}`}
      >
        {loading ? (
          <p className="flex items-center gap-2 p-4 text-[0.85em] text-muted-foreground">
            <Icon name="Loader2" size={15} className="animate-spin" />
            Загружаем архив…
          </p>
        ) : tree.length === 0 ? (
          <Empty
            icon="ClipboardList"
            title="Отчётов пока нет"
            hint="Нажмите «Индивидуальный ежедневный отчёт» — форма заполняется по бланку заказчика."
          />
        ) : (
          tree.map((year) => (
            <div key={year.key} className="border-b border-border last:border-b-0">
              <button
                type="button"
                onClick={() => setOpenYear((p) => (p === year.key ? null : year.key))}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/60"
              >
                <Icon
                  name={openYear === year.key ? 'FolderOpen' : 'Folder'}
                  size={19}
                  className="flex-none text-accent"
                />
                <span className="flex-1 font-head text-[0.95em] uppercase tracking-[0.04em]">
                  {year.label}
                </span>
                <span className="text-[0.8em] text-muted-foreground">{year.count} отчётов</span>
              </button>

              {openYear === year.key &&
                year.months.map((m) => (
                  <div key={m.key} className="border-t border-border/60 bg-secondary/20">
                    <button
                      type="button"
                      onClick={() => setOpenMonth((p) => (p === m.key ? null : m.key))}
                      className="flex w-full items-center gap-3 px-4 py-2.5 pl-8 text-left transition-colors hover:bg-secondary/60"
                    >
                      <Icon
                        name={openMonth === m.key ? 'FolderOpen' : 'Folder'}
                        size={16}
                        className="flex-none text-muted-foreground"
                      />
                      <span className="flex-1 text-[0.92em]">{m.label}</span>
                      <span className="text-[0.78em] text-muted-foreground">{m.count}</span>
                    </button>

                    {openMonth === m.key &&
                      m.days.map((day) => (
                        <div key={day.key} className="border-t border-border/50 bg-card">
                          <button
                            type="button"
                            onClick={() => setOpenDay((p) => (p === day.key ? null : day.key))}
                            className="flex w-full items-center gap-3 px-4 py-2.5 pl-12 text-left transition-colors hover:bg-secondary/60"
                          >
                            <Icon
                              name={openDay === day.key ? 'ChevronDown' : 'ChevronRight'}
                              size={15}
                              className="flex-none text-muted-foreground"
                            />
                            <span className="flex-1 text-[0.9em]">{day.label}</span>
                            <span className="text-[0.78em] text-muted-foreground">
                              {day.items.length}
                            </span>
                          </button>

                          {openDay === day.key &&
                            day.items.map((r) => {
                              const mine = r.authorFio === profile.fio;
                              const canEdit = canSeeAll || mine;
                              return (
                                <div
                                  key={r.id}
                                  className="flex items-center gap-2.5 border-t border-border/40 px-4 py-2.5 pl-16"
                                >
                                  <span className="flex h-8 w-8 flex-none items-center justify-center rounded-sm bg-secondary text-muted-foreground">
                                    <Icon name={KIND_META[r.kind]?.icon ?? 'FileText'} size={15} />
                                  </span>
                                  <span className="min-w-0 flex-1">
                                    <span className="block truncate text-[0.9em]">
                                      Отчёт № {r.number} · {KIND_META[r.kind]?.label}
                                    </span>
                                    <span className="block truncate text-[0.76em] text-muted-foreground">
                                      {objTitle(r.objectId)} · {r.authorFio}
                                    </span>
                                  </span>
                                  <Tag tone={mine ? 'ok' : 'dim'}>{mine ? 'мой' : 'инспектор'}</Tag>
                                  <button
                                    type="button"
                                    title="Создать по образцу"
                                    onClick={() => {
                                      setEditing(null);
                                      setTemplate(r);
                                      setForm(true);
                                    }}
                                    className="flex h-8 w-8 flex-none items-center justify-center rounded-sm bg-secondary transition-colors hover:bg-border"
                                  >
                                    <Icon name="Copy" size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    title="Скачать Word"
                                    onClick={() => downloadIndReport(r, objTitle(r.objectId))}
                                    className="flex h-8 w-8 flex-none items-center justify-center rounded-sm bg-secondary transition-colors hover:bg-border"
                                  >
                                    <Icon name="Download" size={14} />
                                  </button>
                                  {canEdit && (
                                    <button
                                      type="button"
                                      title="Редактировать"
                                      onClick={() => {
                                        setTemplate(null);
                                        setEditing(r);
                                        setForm(true);
                                      }}
                                      className={cn(
                                        'flex h-8 w-8 flex-none items-center justify-center rounded-sm transition-colors',
                                        'bg-secondary hover:bg-border',
                                      )}
                                    >
                                      <Icon name="Pencil" size={14} />
                                    </button>
                                  )}
                                  {canSeeAll && (
                                    <button
                                      type="button"
                                      title="Удалить"
                                      onClick={() => {
                                        remove(r.id);
                                        toast({ title: 'Отчёт удалён' });
                                      }}
                                      className="flex h-8 w-8 flex-none items-center justify-center rounded-sm bg-secondary text-muted-foreground transition-colors hover:bg-border hover:text-destructive"
                                    >
                                      <Icon name="Trash2" size={14} />
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                        </div>
                      ))}
                  </div>
                ))}
            </div>
          ))
        )}
      </Panel>
    </div>
  );
};

export default IndReportsCabinet;
