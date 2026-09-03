import { useMemo } from 'react';
import Icon from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import { ProjectObject } from '@/data/store';
import { useObjectsRollup } from '@/data/rollup';
import { loadBar, loadTone, pct, sumBy } from '@/components/desk/manager/project';

interface ProjectLoadProps {
  objects: ProjectObject[];
  cabinObjectIds: string[];
}

interface Card {
  icon: string;
  label: string;
  fact: number;
  plan: number;
}

const ProjectLoad = ({ objects, cabinObjectIds }: ProjectLoadProps) => {
  const { items: rollup } = useObjectsRollup();

  const ids = useMemo(() => new Set(objects.map((o) => o.id)), [objects]);

  const stats = useMemo(() => {
    const rows = rollup.filter((r) => ids.has(r.objectId));
    const defects = rows.reduce((s, r) => s + (r.defects || 0), 0);
    const ordersTotal = Math.max(
      rows.reduce((s, r) => s + (r.orders || 0), 0),
      sumBy(objects, (o) => o.orders),
    );
    const ordersOpen = sumBy(objects, (o) => o.ordersOpen);
    const notFixed = Math.min(defects, ordersOpen);
    return {
      defects,
      fixed: Math.max(0, defects - notFixed),
      notFixed,
      ordersTotal,
      ordersOpen,
    };
  }, [rollup, ids, objects]);

  const cards: Card[] = [
    {
      icon: 'HardHat',
      label: 'Инспекторы',
      fact: sumBy(objects, (o) => o.staffFact),
      plan: sumBy(objects, (o) => o.staffPlan),
    },
    {
      icon: 'Truck',
      label: 'Техника',
      fact: sumBy(objects, (o) => o.techFact),
      plan: sumBy(objects, (o) => o.techPlan),
    },
    {
      icon: 'Container',
      label: 'Вагоны',
      fact: cabinObjectIds.filter((id) => ids.has(id)).length,
      plan: sumBy(objects, (o) => o.cabins),
    },
  ];

  const chip = (label: string, value: number, tone?: string) => (
    <span className="flex items-baseline gap-1.5 rounded-sm border border-border bg-secondary/40 px-2.5 py-1.5">
      <span className="text-[0.72em] uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </span>
      <span className={cn('font-head text-[0.98em]', tone)}>{value}</span>
    </span>
  );

  return (
    <section className="flex-none rounded-sm border border-border border-t-2 border-t-accent bg-card px-4 py-4 sm:px-5 sm:py-5">
      <h2 className="flex items-center gap-2 font-head text-[0.88em] uppercase tracking-[0.12em]">
        <Icon name="Gauge" size={16} className="text-accent" />
        Загрузка проекта
      </h2>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {cards.map((c) => {
          const p = pct(c.fact, c.plan);
          return (
            <div key={c.label} className="rounded-sm border border-border bg-background px-3 py-3">
              <div className="flex items-center gap-2 text-[0.72em] uppercase tracking-[0.1em] text-muted-foreground">
                <Icon name={c.icon} fallback="Circle" size={14} className="text-accent" />
                {c.label}
              </div>
              <div className="mt-2 font-head text-[26px] leading-none sm:text-[32px]">
                <span className={cn(loadTone(c.fact, c.plan))}>{c.fact}</span>
                <span className="text-muted-foreground"> / {c.plan}</span>
              </div>
              <div className="mt-2.5 h-2 w-full overflow-hidden rounded-sm bg-secondary">
                <div
                  className={cn('h-full rounded-sm', loadBar(c.fact, c.plan))}
                  style={{ width: `${Math.min(100, p)}%` }}
                />
              </div>
              <p className="mt-1.5 text-[0.76em] text-muted-foreground">
                укомплектовано на {p}%
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {chip('Замечаний выдано', stats.defects)}
        {chip('устранено', stats.fixed, 'text-emerald-600')}
        {chip('не устранено', stats.notFixed, 'text-destructive')}
        {chip('Предписаний выдано', stats.ordersTotal)}
        {chip('открыто', stats.ordersOpen, 'text-accent')}
      </div>
    </section>
  );
};

export default ProjectLoad;