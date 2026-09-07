import { useMemo } from 'react';
import Icon from '@/components/ui/icon';
import Empty from '@/components/desk/Empty';
import { cn } from '@/lib/utils';
import { Project } from '@/components/desk/manager/project';
import { useLocations, locIcon } from '@/data/locations';
import { useVehicles, Vehicle } from '@/data/vehicles';

interface ProjectMnemoProps {
  projects: Project[];
  onOpen: (key: string) => void;
}

interface Load {
  staffPlan: number;
  staffFact: number;
  techPlan: number;
  techFact: number;
  cabins: number;
}

const ratio = (plan: number, fact: number) => (plan > 0 ? fact / plan : fact > 0 ? 1 : 0);

const toneOf = (r: number, plan: number) =>
  plan === 0 ? 'dim' : r >= 1 ? 'ok' : r >= 0.7 ? 'wait' : 'hot';

const EDGE: Record<string, string> = {
  ok: 'border-t-accent',
  wait: 'border-t-amber-500',
  hot: 'border-t-destructive',
  dim: 'border-t-border',
};

const FILL: Record<string, string> = {
  ok: 'bg-accent',
  wait: 'bg-amber-500',
  hot: 'bg-destructive',
  dim: 'bg-border',
};

const ProjectMnemo = ({ projects, onOpen }: ProjectMnemoProps) => {
  const { list: locations } = useLocations();
  const { items: cabins } = useVehicles('cabin');

  const cabinsByObject = useMemo(() => {
    const map = new Map<string, number>();
    (cabins ?? []).forEach((c: Vehicle) => {
      if (!c.objectId) return;
      map.set(c.objectId, (map.get(c.objectId) ?? 0) + 1);
    });
    return map;
  }, [cabins]);

  const loadOf = (p: Project): Load =>
    p.objects.reduce<Load>(
      (a, o) => ({
        staffPlan: a.staffPlan + (o.staffPlan || 0),
        staffFact: a.staffFact + (o.staffFact || 0),
        techPlan: a.techPlan + (o.techPlan || 0),
        techFact: a.techFact + (o.techFact || 0),
        cabins: a.cabins + (cabinsByObject.get(o.id) ?? o.cabins ?? 0),
      }),
      { staffPlan: 0, staffFact: 0, techPlan: 0, techFact: 0, cabins: 0 },
    );

  const groups = useMemo(() => {
    const map = new Map<string, Project[]>();
    projects.forEach((p) => {
      const key = p.locationId || '';
      map.set(key, [...(map.get(key) ?? []), p]);
    });
    return [...map.entries()]
      .map(([id, list]) => ({
        id,
        title: list[0]?.locationTitle || 'Без локации',
        icon: locIcon(locations, id) || 'MapPin',
        list: list.sort((a, b) => a.title.localeCompare(b.title, 'ru')),
      }))
      .sort((a, b) => a.title.localeCompare(b.title, 'ru'));
  }, [projects, locations]);

  const metric = (label: string, icon: string, plan: number, fact: number) => {
    const r = ratio(plan, fact);
    const tone = toneOf(r, plan);
    return (
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-1 text-[0.72em]">
          <Icon name={icon} fallback="Circle" size={11} className="translate-y-0.5 text-accent" />
          <span className="truncate text-muted-foreground group-hover:text-background/70">
            {label}
          </span>
          <span className="ml-auto font-head text-[1.05em]">
            {fact}
            <span className="text-muted-foreground group-hover:text-background/70">/{plan}</span>
          </span>
        </span>
        <span className="mt-1 block h-1 w-full overflow-hidden rounded-sm bg-secondary">
          <span
            className={cn('block h-full', FILL[tone])}
            style={{ width: `${Math.min(100, Math.round(r * 100))}%` }}
          />
        </span>
      </span>
    );
  };

  if (projects.length === 0) {
    return (
      <div className="rounded-sm border border-border bg-card">
        <Empty
          icon="LayoutGrid"
          title="Проектов нет"
          hint="Создайте месторождение и объекты в разделе «Объекты»."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {groups.map((g) => {
        const total = g.list.reduce<Load>(
          (a, p) => {
            const l = loadOf(p);
            return {
              staffPlan: a.staffPlan + l.staffPlan,
              staffFact: a.staffFact + l.staffFact,
              techPlan: a.techPlan + l.techPlan,
              techFact: a.techFact + l.techFact,
              cabins: a.cabins + l.cabins,
            };
          },
          { staffPlan: 0, staffFact: 0, techPlan: 0, techFact: 0, cabins: 0 },
        );

        return (
          <section key={g.id} className="rounded-sm border border-border bg-card">
            <header className="flex items-center gap-2.5 border-b border-border px-4 py-2.5">
              <span className="flex h-8 w-8 flex-none items-center justify-center rounded-sm bg-secondary text-accent">
                <Icon name={g.icon} fallback="MapPin" size={16} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-head text-[0.92em] uppercase tracking-[0.05em]">
                  {g.title}
                </span>
                <span className="block truncate text-[0.72em] text-muted-foreground">
                  {g.list.length} проектов · люди {total.staffFact}/{total.staffPlan} · техника{' '}
                  {total.techFact}/{total.techPlan} · вагоны {total.cabins}
                </span>
              </span>
            </header>

            <div className="grid gap-2 p-3 sm:grid-cols-2 xl:grid-cols-3">
              {g.list.map((p) => {
                const l = loadOf(p);
                const tone = toneOf(ratio(l.staffPlan, l.staffFact), l.staffPlan);
                const risk = p.objects.filter((o) => o.status === 'risk').length;
                const openOrders = p.objects.reduce((s, o) => s + (o.ordersOpen || 0), 0);

                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => onOpen(p.key)}
                    className={cn(
                      'group flex flex-col gap-2 rounded-sm border border-border border-t-2 bg-card',
                      'px-3 py-3 text-left transition-colors hover:bg-foreground hover:text-background',
                      EDGE[tone],
                    )}
                  >
                    <span className="flex items-start gap-2">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-head text-[0.9em] uppercase leading-tight tracking-[0.03em]">
                          {p.title}
                        </span>
                        <span className="block truncate text-[0.72em] text-muted-foreground group-hover:text-background/70">
                          {p.objects.length} объектов
                          {risk > 0 ? ` · ${risk} с риском` : ''}
                          {openOrders > 0 ? ` · ${openOrders} предписаний` : ''}
                        </span>
                      </span>
                      <Icon
                        name="ArrowRight"
                        size={15}
                        className="mt-0.5 flex-none text-accent"
                      />
                    </span>

                    <span className="flex gap-3">
                      {metric('Люди', 'Users', l.staffPlan, l.staffFact)}
                      {metric('Техника', 'Truck', l.techPlan, l.techFact)}
                    </span>

                    <span className="flex items-center gap-1.5 text-[0.72em] text-muted-foreground group-hover:text-background/70">
                      <Icon name="Container" size={11} className="text-accent" />
                      Вагоны и бытовки
                      <span className="ml-auto font-head text-[1.05em] text-foreground group-hover:text-background">
                        {l.cabins}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
};

export default ProjectMnemo;
