import { useMemo, useState } from 'react';
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
  id: 'staff' | 'tech' | 'cabin';
  icon: string;
  label: string;
  unit: string;
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

  const cabinsByObject = useMemo(() => {
    const map = new Map<string, number>();
    cabinObjectIds.forEach((id) => map.set(id, (map.get(id) ?? 0) + 1));
    return map;
  }, [cabinObjectIds]);

  const cards: Card[] = [
    {
      id: 'staff',
      icon: 'HardHat',
      label: 'Инспекторы',
      unit: 'чел.',
      fact: sumBy(objects, (o) => o.staffFact),
      plan: sumBy(objects, (o) => o.staffPlan),
    },
    {
      id: 'tech',
      icon: 'Truck',
      label: 'Техника',
      unit: 'ед.',
      fact: sumBy(objects, (o) => o.techFact),
      plan: sumBy(objects, (o) => o.techPlan),
    },
    {
      id: 'cabin',
      icon: 'Container',
      label: 'Вагоны',
      unit: 'шт.',
      fact: cabinObjectIds.filter((id) => ids.has(id)).length,
      plan: sumBy(objects, (o) => o.cabins),
    },
  ];

  const [open, setOpen] = useState<Card['id'] | null>(null);
  const card = cards.find((c) => c.id === open) ?? null;

  const gapRows = card
    ? objects
        .map((o) => {
          const plan =
            card.id === 'staff' ? o.staffPlan : card.id === 'tech' ? o.techPlan : o.cabins;
          const fact =
            card.id === 'staff'
              ? o.staffFact
              : card.id === 'tech'
                ? o.techFact
                : (cabinsByObject.get(o.id) ?? 0);
          return { o, plan, fact, gap: plan - fact };
        })
        .sort((a, b) => b.gap - a.gap)
    : [];

  const shortage = gapRows.filter((r) => r.gap > 0);

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
            <button
              key={c.label}
              type="button"
              onClick={() => setOpen(open === c.id ? null : c.id)}
              className={cn(
                'rounded-sm border bg-background px-3 py-3 text-left transition-colors hover:border-accent',
                open === c.id ? 'border-accent' : 'border-border',
              )}
            >
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
              <p className="mt-1.5 flex items-center gap-1 text-[0.76em] text-muted-foreground">
                укомплектовано на {p}%
                <Icon
                  name={open === c.id ? 'ChevronUp' : 'ChevronDown'}
                  size={13}
                  className="ml-auto text-accent"
                />
              </p>
            </button>
          );
        })}
      </div>

      {card && (
        <div className="mt-3 rounded-sm border border-border bg-background">
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <Icon name={card.icon} fallback="Circle" size={14} className="text-accent" />
            <span className="font-head text-[0.8em] uppercase tracking-[0.1em]">
              {card.label} — чего не хватает
            </span>
            <span className="ml-auto text-[0.76em] text-muted-foreground">
              {shortage.length ? `недобор ${card.plan - card.fact} ${card.unit}` : 'недобора нет'}
            </span>
          </div>

          {gapRows.length === 0 ? (
            <p className="px-3 py-3 text-[0.82em] text-muted-foreground">
              В проекте пока нет объектов.
            </p>
          ) : (
            gapRows.map((r) => (
              <div
                key={r.o.id}
                className="flex items-center gap-3 border-b border-border px-3 py-2 last:border-b-0"
              >
                <Icon
                  name={r.gap > 0 ? 'TriangleAlert' : 'CircleCheck'}
                  size={14}
                  className={cn('flex-none', r.gap > 0 ? 'text-destructive' : 'text-emerald-600')}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.85em]">{r.o.title}</span>
                  <span className="block truncate text-[0.74em] text-muted-foreground">
                    {r.gap > 0
                      ? `не хватает ${r.gap} ${card.unit}`
                      : r.gap < 0
                        ? `сверх плана ${-r.gap} ${card.unit}`
                        : 'укомплектован полностью'}
                  </span>
                </span>
                <span className="flex-none font-head text-[0.95em]">
                  <span className={cn(loadTone(r.fact, r.plan))}>{r.fact}</span>
                  <span className="text-muted-foreground"> / {r.plan}</span>
                </span>
              </div>
            ))
          )}
        </div>
      )}

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