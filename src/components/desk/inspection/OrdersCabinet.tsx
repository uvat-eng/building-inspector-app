import Panel from '@/components/desk/Panel';
import Empty from '@/components/desk/Empty';
import Icon from '@/components/ui/icon';
import Tag from '@/components/desk/Tag';
import { useToast } from '@/hooks/use-toast';
import { ProjectObject } from '@/data/store';
import { useOrders, useContractor, Order } from '@/data/orders';
import { downloadOrder } from '@/lib/orderDoc';
import { usePersistedState } from '@/hooks/usePersistedState';
import OrderView from '@/components/desk/inspection/OrderView';

interface OrdersCabinetProps {
  object: ProjectObject;
  onBack: () => void;
}

const OrdersCabinet = ({ object, onBack }: OrdersCabinetProps) => {
  const { toast } = useToast();
  const { items, loading, update } = useOrders(object.id);
  const { general: contractor } = useContractor(object.id);
  const [openId, setOpenId] = usePersistedState<string | null>(
    `gsi-order-open-${object.id}`,
    null,
  );
  const open = items.find((o) => o.id === openId) ?? null;

  const save = (o: Order) => {
    downloadOrder(o, contractor);
    toast({ title: `Предписание № ${o.number} сохранено`, description: 'Файл Word' });
  };

  if (open) {
    return <OrderView order={open} contractor={contractor} onBack={() => setOpenId(null)} />;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2.5">
      <button
        type="button"
        onClick={onBack}
        className="flex w-fit flex-none items-center gap-1.5 rounded-sm border border-border bg-card px-2.5 py-1 text-[0.78em] uppercase tracking-[0.08em] transition-colors hover:border-accent hover:bg-secondary"
      >
        <Icon name="ArrowLeft" size={14} className="text-accent" />
        К меню объекта
      </button>

      <div className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
        <section className="flex-none rounded-sm border border-border border-t-2 border-t-accent bg-card px-4 py-4">
          <p className="text-[0.72em] uppercase tracking-[0.14em] text-muted-foreground">
            Предписания
          </p>
          <h1 className="mt-1 font-head text-[17px] uppercase leading-[1.15] tracking-[0.02em] sm:text-[22px]">
            {object.title}
          </h1>
          <p className="mt-1.5 text-[0.82em] text-muted-foreground">
            {contractor?.name
              ? `Подрядчик: ${contractor.name}`
              : 'Карточка подрядчика не заполнена менеджером'}
          </p>
        </section>

        <Panel title="Сквозной перечень" note={`${items.length}`}>
          {items.length === 0 ? (
            <Empty
              icon="FileWarning"
              title="Предписаний нет"
              hint="Оформляются из акта осмотра."
            />
          ) : (
            items.map((o) => (
              <div
                key={o.id}
                className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0"
              >
                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-sm bg-secondary text-muted-foreground">
                  <Icon name={o.status === 'done' ? 'FileCheck' : 'FileWarning'} size={17} />
                </span>
                <button type="button" onClick={() => setOpenId(o.id)} className="min-w-0 flex-1 text-left">
                  <span className="block truncate font-head text-[0.95em] uppercase tracking-[0.02em]">
                    Предписание № {o.number}
                  </span>
                  <span className="block truncate text-[0.76em] text-muted-foreground">
                    {new Date(o.createdAt).toLocaleDateString('ru')} ·{' '}
                    {o.issuedTo || contractor?.name || 'получатель не указан'} ·{' '}
                    {(o.body.items ?? []).length} нарушений
                  </span>
                </button>
                <Tag tone={o.status === 'done' ? 'ok' : 'hot'}>
                  {o.status === 'done' ? 'Устранено' : 'Открыто'}
                </Tag>
                <button
                  type="button"
                  title={o.status === 'done' ? 'Вернуть в работу' : 'Отметить устранённым'}
                  onClick={() => update(o.id, { status: o.status === 'done' ? 'open' : 'done' })}
                  className="flex h-8 w-8 flex-none items-center justify-center rounded-sm bg-secondary transition-colors hover:bg-border"
                >
                  <Icon name={o.status === 'done' ? 'RotateCcw' : 'Check'} size={15} />
                </button>
                <button
                  type="button"
                  title="Скачать Word"
                  onClick={() => save(o)}
                  className="flex h-8 w-8 flex-none items-center justify-center rounded-sm bg-secondary transition-colors hover:bg-border"
                >
                  <Icon name="Download" size={15} />
                </button>
              </div>
            ))
          )}
          {loading && items.length === 0 && (
            <p className="px-4 py-4 text-center text-[0.82em] text-muted-foreground">Загрузка…</p>
          )}
        </Panel>
      </div>
    </div>
  );
};

export default OrdersCabinet;