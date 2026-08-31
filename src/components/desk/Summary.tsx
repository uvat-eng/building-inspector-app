import Icon from '@/components/ui/icon';
import { ProjectObject, summarize, money } from '@/data/store';

const Summary = ({ objects }: { objects: ProjectObject[] }) => {
  const s = summarize(objects);

  const cards: { label: string; value: string; note: string; icon: string; alert?: boolean }[] = [
    {
      label: 'Портфель контрактов',
      value: money(s.portfolio),
      note: `${s.total} объектов всего`,
      icon: 'Wallet',
    },
    {
      label: 'Объектов в работе',
      value: String(s.inWork),
      note: `из ${s.total}`,
      icon: 'Building2',
    },
    {
      label: 'Персонал план/факт',
      value: `${s.staffPlan} / ${s.staffFact}`,
      note: s.staffFact < s.staffPlan ? `не хватает ${s.staffPlan - s.staffFact}` : 'укомплектовано',
      icon: 'Users',
      alert: s.staffFact < s.staffPlan,
    },
    {
      label: 'Техника план/факт',
      value: `${s.techPlan} / ${s.techFact}`,
      note: s.techFact < s.techPlan ? `не хватает ${s.techPlan - s.techFact}` : 'укомплектовано',
      icon: 'Truck',
      alert: s.techFact < s.techPlan,
    },
    {
      label: 'Предписаний выдано',
      value: String(s.orders),
      note: `устранено ${s.orders - s.ordersOpen}`,
      icon: 'FileWarning',
    },
    {
      label: 'Не устранено',
      value: String(s.ordersOpen),
      note: s.ordersOpen > 0 ? 'на контроле' : 'просроченных нет',
      icon: 'TriangleAlert',
      alert: s.ordersOpen > 0,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 p-3 md:grid-cols-3 xl:grid-cols-6">
      {cards.map((c, i) => (
        <div
          key={c.label}
          className="animate-fade-in rounded-sm border border-border bg-card p-3"
          style={{ animationDelay: `${i * 50}ms` }}
        >
          <Icon name={c.icon} size={18} className="text-accent" />
          <div className="mt-2 font-head text-xl leading-tight">{c.value}</div>
          <div className="mt-1 text-[0.72em] uppercase leading-snug tracking-[0.1em] text-muted-foreground">
            {c.label}
          </div>
          <div className={`mt-1 text-[0.78em] ${c.alert ? 'text-destructive' : 'text-success'}`}>
            {c.note}
          </div>
        </div>
      ))}
    </div>
  );
};

export default Summary;
