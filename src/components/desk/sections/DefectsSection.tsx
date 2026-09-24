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
import { useOrders } from '@/data/orders';
import {
  Inspection,
  useAllInspections,
  createInspection,
  addDefect,
  suggestNorms,
  deadlineFor,
  DefectRow,
  InspectionDefect,
  useAllDefects,
} from '@/data/inspections';
import { MONTHS } from '@/data/timesheet';
import { orderPayload } from '@/lib/makeOrder';
import DictateDialog from '@/components/desk/defects/DictateDialog';
import OrderQuickView from '@/components/desk/inspection/OrderQuickView';
import { Order } from '@/data/orders';
import ActEditor from '@/components/desk/inspection/ActEditor';
import { updateInspection } from '@/data/inspections';

const monthKey = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Без даты';
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('ru');
};

const DefectsSection = () => {
  const { toast } = useToast();
  const { profile } = useProfile();
  const { list: objects } = useObjects();
  const { items: inspections, loading, reload } = useAllInspections();
  const { items: allDefects } = useAllDefects();
  const { create: createOrder } = useOrders();

  const [dictate, setDictate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [openAct, setOpenAct] = useState<string | null>(null);
  const [openMonth, setOpenMonth] = useState<string | null>(null);
  const [madeOrder, setMadeOrder] = useState<Order | null>(null);
  const [editAct, setEditAct] = useState<Inspection | null>(null);

  const byMonth = useMemo(() => {
    const map = new Map<string, Inspection[]>();
    inspections.forEach((i) => {
      const k = monthKey(i.createdAt);
      map.set(k, [...(map.get(k) ?? []), i]);
    });
    return [...map.entries()];
  }, [inspections]);

  const defectsOf = (inspId: string) =>
    allDefects.filter((d: DefectRow) => d.inspectionId === inspId);

  const objTitle = (id: string) => objects.find((o) => o.id === id)?.title ?? 'Объект';

  const saveDictation = async (data: { objectId: string; workType: string; lines: string[] }) => {
    setBusy(true);
    try {
      const insp = await createInspection({
        objectId: data.objectId,
        workType: data.workType,
        inspector: profile.fio,
      });
      const deadline = deadlineFor('normal');
      const created: InspectionDefect[] = [];
      for (const line of data.lines) {
        created.push(await addDefect(insp.id, line, deadline));
      }
      suggestNorms(data.lines, true)
        .then((found) =>
          Promise.all(
            created.map((d, k) => {
              const m = found[k];
              if (!m?.ref) return null;
              return fetch(
                'https://functions.poehali.dev/26fd0e42-bb64-4022-acb0-097508981039?action=defect',
                {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    action: 'defect',
                    id: d.id,
                    normRef: `${m.ref} — ${m.name}`,
                  }),
                },
              );
            }),
          ),
        )
        .then(() => reload())
        .catch(() => undefined);

      await reload();
      setDictate(false);
      setOpenMonth(monthKey(insp.createdAt));
      setOpenAct(insp.id);
      setEditAct(insp);
      toast({
        title: `Акт № ${insp.number} создан`,
        description: `${data.lines.length} замечаний · ${objTitle(data.objectId)} · нормы подбираются`,
      });
    } catch {
      toast({ title: 'Не удалось создать акт', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const makeOrder = async (insp: Inspection) => {
    setBusy(true);
    try {
      const { data, count } = await orderPayload(
        insp,
        objTitle(insp.objectId),
        profile.fio,
        '',
        objects.find((o) => o.id === insp.objectId) ?? null,
      );
      const order = await createOrder(data);
      setMadeOrder(order);
      toast({
        title: `Предписание № ${order.number} создано`,
        description: `${count} пунктов · открываем`,
      });
    } catch {
      toast({ title: 'Не удалось оформить предписание', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  if (madeOrder) {
    return <OrderQuickView order={madeOrder} onBack={() => setMadeOrder(null)} />;
  }

  if (editAct) {
    return (
      <ActEditor
        inspection={editAct}
        objectTitle={objTitle(editAct.objectId)}
        onBack={() => {
          setEditAct(null);
          reload();
        }}
        onFinish={(i) => updateInspection(i.id, { status: 'done' })}
        onOrder={(i) => makeOrder(i)}
      />
    );
  }

  return (
    <div className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto pr-0.5">
      <button
        type="button"
        onClick={() => setDictate(true)}
        className="flex flex-none items-center justify-center gap-3 rounded-sm bg-accent px-5 py-5 font-head text-[1.15em] uppercase tracking-[0.06em] text-accent-foreground transition-colors hover:bg-accent/90"
      >
        <Icon name="Mic" size={26} />
        Начать говорить замечания
      </button>

      <Panel title="Акты замечаний по месяцам" note={`${inspections.length} актов`}>
        {loading ? (
          <p className="flex items-center gap-2 p-4 text-[0.85em] text-muted-foreground">
            <Icon name="Loader2" size={15} className="animate-spin" />
            Загружаем архив…
          </p>
        ) : byMonth.length === 0 ? (
          <Empty
            icon="ClipboardList"
            title="Актов пока нет"
            hint="Нажмите «Начать говорить замечания» — акт соберётся сам."
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
                  {month}
                </span>
                <span className="flex-none text-[0.8em] text-muted-foreground">
                  {list.length} актов
                </span>
              </button>

              {openMonth === month &&
                list.map((insp) => {
                  const items = defectsOf(insp.id);
                  const isOpen = openAct === insp.id;
                  return (
                    <div key={insp.id} className="border-t border-border/60 bg-secondary/20">
                      <div className="flex w-full items-center gap-2 px-4 py-3 pl-8 transition-colors hover:bg-secondary/60">
                        <button
                          type="button"
                          title={isOpen ? 'Свернуть' : 'Показать замечания'}
                          onClick={() => setOpenAct((p) => (p === insp.id ? null : insp.id))}
                          className="flex h-8 w-8 flex-none items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-secondary"
                        >
                          <Icon name={isOpen ? 'ChevronDown' : 'ChevronRight'} size={18} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditAct(insp)}
                          className="flex min-w-0 flex-1 items-center gap-2 text-left"
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[0.95em]">
                              Акт № {insp.number}
                            </span>
                            <span className="block truncate text-[0.8em] text-muted-foreground">
                              {fmtDate(insp.createdAt)} · {objTitle(insp.objectId)} ·{' '}
                              {insp.workType || 'вид работ не указан'}
                            </span>
                          </span>
                          <Tag tone={insp.status === 'done' ? 'ok' : 'wait'}>
                            {items.length || insp.defectCount || 0} зам.
                          </Tag>
                          <Icon
                            name="SquarePen"
                            size={16}
                            className="flex-none text-accent"
                          />
                        </button>
                      </div>

                      {isOpen && (
                        <div className="bg-card px-4 pb-3 pl-8 pt-1">
                          {items.length === 0 ? (
                            <p className="py-2 text-[0.84em] text-muted-foreground">
                              Замечаний в акте нет.
                            </p>
                          ) : (
                            <ol className="flex flex-col">
                              {items.map((d) => (
                                <li key={d.id} className="border-b border-border/50 last:border-b-0">
                                  <button
                                    type="button"
                                    onClick={() => setEditAct(insp)}
                                    className="flex w-full gap-3 py-2.5 text-left transition-colors hover:bg-secondary/50"
                                  >
                                    <span className="w-5 flex-none text-right font-head text-[0.9em] text-accent">
                                      {d.pos}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                      <span className="block text-[0.92em]">{d.title}</span>
                                      <span className="block text-[0.8em] text-muted-foreground">
                                        {d.normRef ? (
                                          d.normRef
                                        ) : (
                                          <span className="inline-flex items-center gap-1">
                                            <Icon name="Sparkles" size={12} /> норма подбирается
                                          </span>
                                        )}
                                        {d.deadline ? ` · срок ${d.deadline}` : ''}
                                      </span>
                                    </span>
                                    <Icon
                                      name="ChevronRight"
                                      size={15}
                                      className="mt-1 flex-none text-muted-foreground"
                                    />
                                  </button>
                                </li>
                              ))}
                            </ol>
                          )}

                          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditAct(insp)}
                              className="h-9 flex-1 gap-2 rounded-sm font-head text-[0.85em] uppercase tracking-[0.06em]"
                            >
                              <Icon name="SquarePen" size={15} />
                              Открыть акт
                            </Button>
                            <Button
                              size="sm"
                              disabled={busy || items.length === 0}
                              onClick={() => makeOrder(insp)}
                              className={cn(
                                'h-9 flex-1 gap-2 rounded-sm font-head text-[0.85em] uppercase tracking-[0.06em]',
                                'bg-accent text-accent-foreground hover:bg-accent/90',
                              )}
                            >
                              <Icon
                                name={busy ? 'Loader2' : 'FileWarning'}
                                size={15}
                                className={busy ? 'animate-spin' : ''}
                              />
                              Сформировать предписание
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

      <DictateDialog
        open={dictate}
        onOpenChange={setDictate}
        objects={objects}
        busy={busy}
        onSave={saveDictation}
      />
    </div>
  );
};

export default DefectsSection;