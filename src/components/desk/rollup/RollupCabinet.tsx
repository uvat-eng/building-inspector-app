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
import { useOrders, Order } from '@/data/orders';
import { useAllDefects, DefectRow, InspectionDefect, updateDefect } from '@/data/inspections';
import DefectEditDialog from '@/components/desk/rollup/DefectEditDialog';
import { downloadOrdersRollup, downloadDefectsJournal } from '@/lib/rollupXls';

interface RollupCabinetProps {
  onBack?: () => void;
}

const isDone = (s?: string) => (s ?? '').toLowerCase().startsWith('устранен');

const RollupCabinet = ({ onBack }: RollupCabinetProps) => {
  const { toast } = useToast();
  const { profile } = useProfile();
  const { list: objects } = useObjects();
  const { items: orders, update: updateOrder } = useOrders();
  const { items: defects, reload } = useAllDefects();

  const [tab, setTab] = useState<'orders' | 'defects'>('orders');
  const [edit, setEdit] = useState<DefectRow | null>(null);
  const [busy, setBusy] = useState(false);

  const canEdit = ['engineer', 'manager', 'director', 'admin', 'coordinator', 'pm'].includes(
    profile.role,
  );

  const objTitle = (id: string) => objects.find((o) => o.id === id)?.title ?? 'Объект';
  const contractorOf = (d: DefectRow) =>
    d.contractor || d.subcontractor || d.generalContractor || '—';

  const ctx = { objectTitle: objTitle, contractorOf };

  const stats = useMemo(() => {
    const done = orders.filter((o) => o.status === 'done').length;
    const dDone = defects.filter((d) => isDone(d.fixStatus)).length;
    return {
      orders: orders.length,
      ordersDone: done,
      ordersOpen: orders.length - done,
      defects: defects.length,
      defectsDone: dDone,
      defectsOpen: defects.length - dDone,
    };
  }, [orders, defects]);

  const save = async (patch: Partial<InspectionDefect>) => {
    if (!edit) return;
    setBusy(true);
    try {
      await updateDefect(edit.id, patch);
      await reload();
      setEdit(null);
      toast({ title: 'Замечание обновлено' });
    } catch {
      toast({ title: 'Не удалось сохранить', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const toggleOrder = async (o: Order) => {
    await updateOrder(o.id, {
      status: o.status === 'done' ? 'open' : 'done',
      fixDate: o.status === 'done' ? '' : new Date().toLocaleDateString('ru'),
    });
  };

  const counters = [
    { icon: 'FileWarning', label: 'Предписаний', value: stats.orders },
    { icon: 'CircleCheck', label: 'Устранено', value: stats.ordersDone },
    { icon: 'TriangleAlert', label: 'Замечаний', value: stats.defects },
    { icon: 'Clock', label: 'Не устранено', value: stats.defectsOpen },
  ];

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
          onClick={() => downloadOrdersRollup(orders, defects, ctx)}
          className="flex-1 gap-2 rounded-sm bg-accent font-head text-[0.85em] uppercase tracking-[0.06em] text-accent-foreground hover:bg-accent/90"
        >
          <Icon name="FileSpreadsheet" size={16} />
          Сводный отчёт по предписаниям
        </Button>
        <Button
          onClick={() => downloadDefectsJournal(defects, ctx)}
          variant="outline"
          className="flex-1 gap-2 rounded-sm font-head text-[0.85em] uppercase tracking-[0.06em]"
        >
          <Icon name="BookText" size={16} className="text-accent" />
          Журнал замечаний
        </Button>
      </div>

      <div className="flex flex-none gap-1">
        {(
          [
            ['orders', `Предписания · ${orders.length}`],
            ['defects', `Замечания · ${defects.length}`],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              'flex-1 rounded-sm px-3 py-2 text-[0.85em] tracking-[0.04em] transition-colors',
              tab === id
                ? 'bg-accent text-accent-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-border',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'orders' ? (
        <Panel title="Свод предписаний" note={`не устранено ${stats.ordersOpen}`}>
          {orders.length === 0 ? (
            <Empty
              icon="FileWarning"
              title="Предписаний нет"
              hint="Оформляются из актов проверок инспекторами."
            />
          ) : (
            orders.map((o) => (
              <div
                key={o.id}
                className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0"
              >
                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-sm bg-secondary text-muted-foreground">
                  <Icon name={o.status === 'done' ? 'FileCheck' : 'FileWarning'} size={16} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.93em]">
                    Предписание № {o.number} · {o.issuedTo || '—'}
                  </span>
                  <span className="block truncate text-[0.76em] text-muted-foreground">
                    {objTitle(o.objectId)} · {(o.body.items ?? []).length} нарушений ·{' '}
                    {o.deadline ? `срок ${o.deadline}` : 'срок не указан'}
                    {o.fixDate ? ` · устранено ${o.fixDate}` : ''}
                  </span>
                </span>
                {o.stopWorks && <Tag tone="hot">остановка</Tag>}
                <Tag tone={o.status === 'done' ? 'ok' : 'wait'}>
                  {o.status === 'done' ? 'Устранено' : 'Открыто'}
                </Tag>
                {canEdit && (
                  <button
                    type="button"
                    title="Переключить статус"
                    onClick={() => toggleOrder(o)}
                    className="flex h-8 w-8 flex-none items-center justify-center rounded-sm bg-secondary transition-colors hover:bg-border"
                  >
                    <Icon name={o.status === 'done' ? 'RotateCcw' : 'Check'} size={14} />
                  </button>
                )}
              </div>
            ))
          )}
        </Panel>
      ) : (
        <Panel title="Свод замечаний" note={`не устранено ${stats.defectsOpen}`}>
          {defects.length === 0 ? (
            <Empty
              icon="TriangleAlert"
              title="Замечаний нет"
              hint="Появятся после выездов инспекторов на объекты."
            />
          ) : (
            defects.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setEdit(d)}
                className="flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-secondary/60"
              >
                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-sm bg-secondary text-muted-foreground">
                  <Icon name={isDone(d.fixStatus) ? 'CircleCheck' : 'TriangleAlert'} size={16} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.93em]">{d.title}</span>
                  <span className="block truncate text-[0.76em] text-muted-foreground">
                    {contractorOf(d)} · {d.place || objTitle(d.objectId)} · акт № {d.inspNumber}
                    {d.category ? ` · ${d.category}` : ''}
                  </span>
                </span>
                <Tag tone={isDone(d.fixStatus) ? 'ok' : 'wait'}>
                  {d.fixStatus || 'не устранено'}
                </Tag>
                <Icon name="Pencil" size={14} className="flex-none text-muted-foreground" />
              </button>
            ))
          )}
        </Panel>
      )}

      <DefectEditDialog
        defect={edit}
        busy={busy}
        onClose={() => setEdit(null)}
        onSave={save}
      />
    </div>
  );
};

export default RollupCabinet;
