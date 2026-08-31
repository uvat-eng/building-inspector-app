import Panel from '@/components/desk/Panel';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Order, Contractor } from '@/data/orders';
import { downloadOrder, buildOrderHtml } from '@/lib/orderDoc';

interface OrderViewProps {
  order: Order;
  contractor?: Contractor | null;
  onBack: () => void;
}

const Row = ({ label, value }: { label: string; value?: string }) =>
  value ? (
    <div className="flex gap-2 border-b border-border/60 py-1.5 last:border-b-0">
      <span className="w-[45%] flex-none text-[0.78em] uppercase tracking-[0.06em] text-muted-foreground">
        {label}
      </span>
      <span className="min-w-0 flex-1 text-[0.88em]">{value}</span>
    </div>
  ) : null;

const OrderView = ({ order, contractor, onBack }: OrderViewProps) => {
  const { toast } = useToast();
  const items = order.body.items ?? [];

  const save = () => {
    downloadOrder(order, contractor);
    toast({ title: `Предписание № ${order.number}`, description: 'Файл Word сохранён' });
  };

  const print = () => {
    const w = window.open('', '_blank');
    if (!w) {
      toast({ title: 'Разрешите всплывающие окна', variant: 'destructive' });
      return;
    }
    w.document.write(buildOrderHtml(order, contractor));
    w.document.close();
    setTimeout(() => w.print(), 400);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2.5">
      <button
        type="button"
        onClick={onBack}
        className="flex w-fit flex-none items-center gap-1.5 rounded-sm border border-border bg-card px-2.5 py-1 text-[0.78em] uppercase tracking-[0.08em] transition-colors hover:border-accent hover:bg-secondary"
      >
        <Icon name="ArrowLeft" size={14} className="text-accent" />
        К предписаниям
      </button>

      <div className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
        <section className="flex-none rounded-sm border border-border border-t-2 border-t-accent bg-card px-4 py-4">
          <p className="text-[0.72em] uppercase tracking-[0.14em] text-muted-foreground">
            Предписание
          </p>
          <h1 className="mt-1 font-head text-[18px] uppercase leading-[1.15] tracking-[0.02em] sm:text-[24px]">
            № {order.number}
          </h1>
          <p className="mt-1.5 text-[0.82em] text-muted-foreground">
            от {new Date(order.createdAt).toLocaleDateString('ru')} ·{' '}
            {order.status === 'done' ? 'устранено' : 'открыто'}
          </p>
        </section>

        <Panel title="Реквизиты" note="">
          <div className="px-4 py-2">
            <Row label="Объект" value={order.body.objectTitle} />
            <Row label="Кому выдано" value={order.issuedTo || contractor?.name} />
            <Row label="ИНН" value={contractor?.inn} />
            <Row label="Адрес" value={contractor?.address} />
            <Row label="Руководитель" value={contractor?.director} />
            <Row label="Генподрядчик" value={order.body.generalContractor} />
            <Row label="Субподрядчик" value={order.body.subcontractor} />
            <Row label="Вид работ" value={order.body.workType} />
            <Row label="Раздел проекта" value={order.body.docRef} />
            <Row label="Представитель подрядчика" value={order.body.contractorRep} />
            <Row label="Выдал" value={order.inspector} />
            <Row label="Срок устранения" value={order.deadline} />
          </div>
        </Panel>

        <Panel title="Выявленные нарушения" note={`${items.length}`}>
          {items.length === 0 ? (
            <p className="px-4 py-5 text-center text-[0.85em] text-muted-foreground">
              Нарушения не перечислены
            </p>
          ) : (
            items.map((it, i) => (
              <div key={i} className="border-b border-border px-4 py-3 last:border-b-0">
                <div className="flex gap-2.5">
                  <span className="w-6 flex-none font-head text-[0.95em]">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.92em]">{it.title}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-[0.78em] text-muted-foreground">
                      <Icon name="BookMarked" size={12} className="flex-none text-accent" />
                      {it.normRef || 'норматив не указан'}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-[0.78em] text-muted-foreground">
                      <Icon name="CalendarClock" size={12} className="flex-none text-accent" />
                      Устранить до: {it.deadline || order.deadline || 'срок не задан'}
                    </p>
                    {it.photos?.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {it.photos.map((p, k) => (
                          <button
                            key={k}
                            type="button"
                            onClick={() => window.open(p, '_blank')}
                            className="h-16 w-16 overflow-hidden rounded-sm border border-border"
                          >
                            <img src={p} alt="" className="h-full w-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </Panel>

        <div className="flex flex-none flex-col gap-2 sm:flex-row">
          <Button
            onClick={save}
            className="flex-1 gap-2 rounded-sm bg-accent font-head uppercase tracking-[0.06em] text-accent-foreground hover:bg-accent/90"
          >
            <Icon name="FileDown" size={16} />
            Скачать Word
          </Button>
          <Button
            variant="outline"
            onClick={print}
            className="flex-1 gap-2 rounded-sm font-head uppercase tracking-[0.06em]"
          >
            <Icon name="Printer" size={16} />
            Печать / PDF
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OrderView;