import { useEffect, useMemo, useState } from 'react';
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

const ZERO: Load = { staffPlan: 0, staffFact: 0, techPlan: 0, techFact: 0, cabins: 0 };

const ratio = (plan: number, fact: number) => (plan > 0 ? fact / plan : fact > 0 ? 1 : 0);

const toneOf = (plan: number, fact: number) => {
  if (plan === 0 && fact === 0) return 'dim';
  const r = ratio(plan, fact);
  return r >= 1 ? 'ok' : r >= 0.7 ? 'wait' : 'hot';
};

const DOT: Record<string, string> = {
  ok: 'bg-accent',
  wait: 'bg-amber-500',
  hot: 'bg-destructive',
  dim: 'bg-muted-foreground/40',
};

const EDGE: Record<string, string> = {
  ok: 'border-l-accent',
  wait: 'border-l-amber-500',
  hot: 'border-l-destructive',
  dim: 'border-l-border',
};

const RING: Record<string, string> = {
  ok: 'border-accent',
  wait: 'border-amber-500',
  hot: 'border-destructive',
  dim: 'border-border',
};

const TEXT: Record<string, string> = {
  ok: 'text-accent',
  wait: 'text-amber-500',
  hot: 'text-destructive',
  dim: 'text-muted-foreground',
};

const STORE_KEY = 'mnemo-collapsed';

const readCollapsed = (): string[] => {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
};

const ProjectMnemo = ({ projects, onOpen }: ProjectMnemoProps) => {
  const { list: locations } = useLocations();
  const { items: cabins } = useVehicles('cabin');
  const [collapsed, setCollapsed] = useState<string[]>(readCollapsed);

  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(collapsed));
    } catch {
      /* хранилище недоступно */
    }
  }, [collapsed]);

  const toggle = (id: string) =>
    setCollapsed((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

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
      { ...ZERO },
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

  if (projects.length === 0) {
    return (
      <div className="rounded-sm border border-border bg-card">
        <Empty
          icon="Network"
          title="Проектов нет"
          hint="Создайте месторождение и объекты в разделе «Объекты»."
        />
      </div>
    );
  }

  const chip = (icon: string, label: string, plan: number, fact: number) => (
    <span className="flex items-center gap-1 rounded-sm border border-border bg-secondary/60 px-1.5 py-0.5 text-[0.7em] group-hover:border-background/25 group-hover:bg-background/10">
      <Icon
        name={icon}
        fallback="Circle"
        size={11}
        className={TEXT[toneOf(plan, fact)]}
      />
      <span className="text-muted-foreground group-hover:text-background/60">{label}</span>
      <span className="font-head text-[1.1em]">
        {fact}
        <span className="text-muted-foreground group-hover:text-background/60">/{plan}</span>
      </span>
    </span>
  );

  const allIds = groups.map((g) => g.id);
  const allClosed = allIds.every((id) => collapsed.includes(id));

  return (
    <div className="flex flex-col gap-3">
      {groups.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setCollapsed(allClosed ? [] : allIds)}
            className="flex items-center gap-1.5 rounded-sm border border-border bg-card px-2.5 py-1 text-[0.76em] uppercase tracking-[0.08em] transition-colors hover:border-accent hover:bg-secondary"
          >
            <Icon
              name={allClosed ? 'ChevronsDown' : 'ChevronsUp'}
              size={14}
              className="text-accent"
            />
            {allClosed ? 'Развернуть все' : 'Свернуть все'}
          </button>
          <span className="text-[0.74em] text-muted-foreground">
            {groups.length - collapsed.length} из {groups.length} локаций раскрыто
          </span>
        </div>
      )}

      {groups.map((g) => {
        const total = g.list.reduce<Load>((a, p) => {
          const l = loadOf(p);
          return {
            staffPlan: a.staffPlan + l.staffPlan,
            staffFact: a.staffFact + l.staffFact,
            techPlan: a.techPlan + l.techPlan,
            techFact: a.techFact + l.techFact,
            cabins: a.cabins + l.cabins,
          };
        }, ZERO);
        const rootTone = toneOf(total.staffPlan, total.staffFact);
        const isClosed = collapsed.includes(g.id);
        const riskAll = g.list.reduce(
          (s, p) => s + p.objects.filter((o) => o.status === 'risk').length,
          0,
        );

        return (
          <section
            key={g.id}
            className={cn(
              'rounded-sm border border-border bg-card p-3 sm:p-4',
              !isClosed && 'sm:flex sm:gap-0',
            )}
          >
            <button
              type="button"
              onClick={() => toggle(g.id)}
              title={isClosed ? 'Развернуть локацию' : 'Свернуть локацию'}
              className={cn(
                'flex w-full flex-none items-start gap-2.5 text-left',
                !isClosed && 'sm:w-52 sm:flex-col sm:justify-center sm:pr-3',
              )}
            >
              <span
                className={cn(
                  'flex h-11 w-11 flex-none items-center justify-center rounded-sm border-2 bg-secondary text-accent',
                  RING[rootTone],
                )}
              >
                <Icon name={g.icon} fallback="MapPin" size={19} />
              </span>
              <span className={cn('min-w-0 flex-1', !isClosed && 'sm:mt-2')}>
                <span className="flex items-center gap-2">
                  <span className="truncate font-head text-[0.95em] uppercase leading-tight tracking-[0.05em]">
                    {g.title}
                  </span>
                  <Icon
                    name={isClosed ? 'ChevronDown' : 'ChevronUp'}
                    size={15}
                    className={cn('flex-none text-accent', !isClosed && 'sm:hidden')}
                  />
                </span>
                <span className="mt-0.5 block text-[0.72em] text-muted-foreground">
                  {g.list.length} проектов · {g.list.reduce((s, p) => s + p.objects.length, 0)}{' '}
                  объектов
                  {isClosed && riskAll > 0 ? ` · риск ${riskAll}` : ''}
                </span>
                <span className="mt-1 flex items-center gap-1 text-[0.72em] text-muted-foreground">
                  <span className={cn('h-1.5 w-1.5 flex-none rounded-full', DOT[rootTone])} />
                  {total.staffFact}/{total.staffPlan} чел · {total.techFact}/{total.techPlan} тех ·{' '}
                  {total.cabins} ваг
                </span>
                {isClosed && (
                  <span className="mt-1.5 flex flex-wrap gap-1">
                    {g.list.slice(0, 6).map((p) => {
                      const l = loadOf(p);
                      return (
                        <span
                          key={p.key}
                          title={p.title}
                          className={cn(
                            'h-1.5 w-6 rounded-sm',
                            DOT[toneOf(l.staffPlan, l.staffFact)],
                          )}
                        />
                      );
                    })}
                    {g.list.length > 6 && (
                      <span className="text-[0.68em] text-muted-foreground">
                        +{g.list.length - 6}
                      </span>
                    )}
                  </span>
                )}
              </span>
            </button>

            <div
              className={cn(
                'relative mt-3 flex-1 pl-7 sm:mt-0 sm:pl-8',
                isClosed && 'hidden',
              )}
            >
              <span
                aria-hidden
                className="absolute bottom-5 left-0 top-5 w-px bg-border sm:left-1"
              />

              <div className="flex flex-col gap-2">
                {g.list.map((p) => {
                  const l = loadOf(p);
                  const tone = toneOf(l.staffPlan, l.staffFact);
                  const risk = p.objects.filter((o) => o.status === 'risk').length;
                  const orders = p.objects.reduce((s, o) => s + (o.ordersOpen || 0), 0);

                  return (
                    <div key={p.key} className="relative flex items-center">
                      <span
                        aria-hidden
                        className="absolute -left-7 h-px w-7 bg-border sm:-left-7 sm:w-6"
                      />
                      <span
                        aria-hidden
                        className={cn(
                          'absolute -left-[1.85rem] h-2 w-2 rounded-full ring-2 ring-card sm:-left-[1.6rem]',
                          DOT[tone],
                        )}
                      />

                      <button
                        type="button"
                        onClick={() => onOpen(p.key)}
                        title={`${p.title} · объектов ${p.objects.length} · люди ${l.staffFact} из ${l.staffPlan} · техника ${l.techFact} из ${l.techPlan} · вагоны ${l.cabins}${risk ? ` · объектов с риском ${risk}` : ''}${orders ? ` · открытых предписаний ${orders}` : ''}`}
                        className={cn(
                          'group flex w-full items-center gap-2.5 rounded-sm border border-l-4 border-border bg-card',
                          'px-3 py-2 text-left transition-colors hover:bg-foreground hover:text-background',
                          EDGE[tone],
                        )}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="truncate font-head text-[0.88em] uppercase leading-tight tracking-[0.03em]">
                              {p.title}
                            </span>
                            <span className="flex-none rounded-sm bg-secondary px-1.5 py-0.5 text-[0.68em] text-muted-foreground group-hover:bg-background/10 group-hover:text-background/70">
                              {p.objects.length} об.
                            </span>
                            {risk > 0 && (
                              <span className="flex-none text-[0.68em] text-destructive">
                                риск {risk}
                              </span>
                            )}
                          </span>

                          <span className="mt-1.5 flex flex-wrap items-center gap-1">
                            {chip('Users', 'люди', l.staffPlan, l.staffFact)}
                            {chip('Truck', 'техн.', l.techPlan, l.techFact)}
                            <span className="flex items-center gap-1 rounded-sm border border-border bg-secondary/60 px-1.5 py-0.5 text-[0.7em] group-hover:border-background/25 group-hover:bg-background/10">
                              <Icon name="Container" size={11} className="text-accent" />
                              <span className="text-muted-foreground group-hover:text-background/60">
                                вагоны
                              </span>
                              <span className="font-head text-[1.1em]">{l.cabins}</span>
                            </span>
                          </span>
                        </span>

                        <Icon name="ChevronRight" size={16} className="flex-none text-accent" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
};

export default ProjectMnemo;