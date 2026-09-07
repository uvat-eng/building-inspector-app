import { useMemo, useState } from 'react';
import Panel from '@/components/desk/Panel';
import Empty from '@/components/desk/Empty';
import Icon from '@/components/ui/icon';
import Tag from '@/components/desk/Tag';
import { cn } from '@/lib/utils';
import { ProjectObject } from '@/data/store';
import { useUsers, User } from '@/data/users';
import { useVehicles, Vehicle } from '@/data/vehicles';
import { useIndReports } from '@/data/indreports';
import ChiefScopeProvider from '@/data/chiefScope';
import ChiefWorkspace from '@/components/desk/manager/ChiefWorkspace';

interface ProjectChiefsProps {
  projectTitle: string;
  objects: ProjectObject[];
}

const ProjectChiefs = ({ projectTitle, objects }: ProjectChiefsProps) => {
  const { users } = useUsers();
  const { items: assets } = useVehicles();
  const { items: reports } = useIndReports({});
  const [open, setOpen] = useState<User | null>(null);

  const objectIds = useMemo(() => objects.map((o) => o.id), [objects]);
  const objTitle = (id: string) => objects.find((o) => o.id === id)?.title ?? '';

  const chiefs = useMemo(
    () =>
      (users ?? [])
        .filter(
          (u: User) =>
            u.role === 'engineer' &&
            (u.group === projectTitle || (u.objects ?? []).some((id) => objectIds.includes(id))),
        )
        .sort((a, b) => a.fio.localeCompare(b.fio, 'ru')),
    [users, projectTitle, objectIds],
  );

  const rows = useMemo(
    () =>
      chiefs.map((c) => {
        const own = (c.objects ?? []).filter((id) => objectIds.includes(id));
        const scope = own.length ? own : objectIds;
        const team = (users ?? []).filter(
          (u: User) =>
            ['inspector', 'driver', 'mechanic'].includes(u.role) &&
            (u.chief === c.fio || (u.objects ?? []).some((id) => scope.includes(id))),
        );
        const tech = (assets ?? []).filter(
          (v: Vehicle) => v.assetType === 'vehicle' && scope.includes(v.objectId),
        );
        const cabinsOn = (assets ?? []).filter(
          (v: Vehicle) => v.assetType === 'cabin' && scope.includes(v.objectId),
        );
        const objs = objects.filter((o) => scope.includes(o.id));
        const load = objs.reduce(
          (a, o) => ({
            staffPlan: a.staffPlan + (o.staffPlan || 0),
            staffFact: a.staffFact + (o.staffFact || 0),
            techPlan: a.techPlan + (o.techPlan || 0),
            techFact: a.techFact + (o.techFact || 0),
          }),
          { staffPlan: 0, staffFact: 0, techPlan: 0, techFact: 0 },
        );
        const names = team.map((u: User) => u.fio);
        const reportCount = reports.filter(
          (r) => names.includes(r.authorFio) || r.authorFio === c.fio,
        ).length;
        return {
          chief: c,
          scope,
          objs,
          team,
          inspectors: team.filter((u: User) => u.role === 'inspector'),
          tech,
          cabins: cabinsOn,
          load,
          reportCount,
        };
      }),
    [chiefs, users, assets, objects, objectIds, reports],
  );

  if (open) {
    const row = rows.find((r) => r.chief.id === open.id);
    return (
      <ChiefScopeProvider value={{ objectIds: row?.scope ?? [], chiefFio: open.fio }}>
        <ChiefWorkspace chief={open} onBack={() => setOpen(null)} />
      </ChiefScopeProvider>
    );
  }

  return (
    <Panel title="Старшие инспекторы проекта" note={`${rows.length}`}>
      {rows.length === 0 ? (
        <Empty
          icon="ShieldCheck"
          title="Старших инспекторов нет"
          hint="Заведите учётную запись и закрепите за ней объекты в разделе «Персонал»."
        />
      ) : (
        rows.map((r) => (
          <div key={r.chief.id} className="border-b border-border last:border-b-0">
            <button
              type="button"
              onClick={() => setOpen(r.chief)}
              className="group flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/60"
            >
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-sm bg-secondary text-accent">
                <Icon name="ShieldCheck" size={18} />
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate font-head text-[0.94em] uppercase tracking-[0.03em]">
                  {r.chief.fio}
                </span>
                <span className="mt-0.5 block truncate text-[0.76em] text-muted-foreground">
                  объектов {r.objs.length} · инспекторов {r.inspectors.length} · техники{' '}
                  {r.tech.length} · вагонов {r.cabins.length} · отчётов {r.reportCount}
                </span>
                <span className="mt-1.5 flex flex-wrap gap-1.5">
                  <Tag tone={r.load.staffFact >= r.load.staffPlan ? 'ok' : 'wait'}>
                    люди {r.load.staffFact}/{r.load.staffPlan}
                  </Tag>
                  <Tag tone={r.load.techFact >= r.load.techPlan ? 'ok' : 'wait'}>
                    техника {r.load.techFact}/{r.load.techPlan}
                  </Tag>
                  {r.chief.phone && <Tag tone="dim">{r.chief.phone}</Tag>}
                </span>
              </span>

              <Icon name="ArrowRight" size={17} className="mt-1 flex-none text-accent" />
            </button>

            <div className="grid gap-3 px-4 pb-3 pl-16 sm:grid-cols-2">
              <div>
                <p className="text-[0.7em] uppercase tracking-[0.1em] text-muted-foreground">
                  Объекты ({r.objs.length})
                </p>
                <ul className="mt-1 space-y-0.5 text-[0.82em]">
                  {r.objs.slice(0, 6).map((o) => (
                    <li key={o.id} className="truncate">
                      {o.title}
                      <span className="text-muted-foreground">
                        {' '}
                        · люди {o.staffFact || 0}/{o.staffPlan || 0}
                      </span>
                    </li>
                  ))}
                  {r.objs.length === 0 && (
                    <li className="text-muted-foreground">Объекты не закреплены</li>
                  )}
                </ul>
              </div>

              <div>
                <p className="text-[0.7em] uppercase tracking-[0.1em] text-muted-foreground">
                  Инспекторы в подчинении ({r.inspectors.length})
                </p>
                <ul className="mt-1 space-y-0.5 text-[0.82em]">
                  {r.inspectors.slice(0, 6).map((u: User) => (
                    <li key={u.id} className={cn('truncate')}>
                      {u.fio}
                      <span className="text-muted-foreground">
                        {' '}
                        · {(u.objects ?? []).map(objTitle).filter(Boolean).join(', ') || 'без объекта'}
                      </span>
                    </li>
                  ))}
                  {r.inspectors.length === 0 && (
                    <li className="text-muted-foreground">Никто не закреплён</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        ))
      )}
    </Panel>
  );
};

export default ProjectChiefs;
