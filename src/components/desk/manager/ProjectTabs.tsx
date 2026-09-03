import { useMemo, useState } from 'react';
import Panel from '@/components/desk/Panel';
import Row from '@/components/desk/Row';
import Empty from '@/components/desk/Empty';
import Tag from '@/components/desk/Tag';
import { cn } from '@/lib/utils';
import { ProjectObject, STATUS_LABEL } from '@/data/store';
import { useUsers } from '@/data/users';
import { useVehicles, Vehicle } from '@/data/vehicles';
import { useInspectorsRollup } from '@/data/rollup';
import { ROLE_LABEL } from '@/data/profile';

type Tab = 'objects' | 'staff' | 'vehicles' | 'cabins';

const TABS: { id: Tab; label: string }[] = [
  { id: 'objects', label: 'Объекты' },
  { id: 'staff', label: 'Инспекторы' },
  { id: 'vehicles', label: 'Транспорт' },
  { id: 'cabins', label: 'Вагоны' },
];

interface ProjectTabsProps {
  projectTitle: string;
  objects: ProjectObject[];
  cabins: Vehicle[];
  onOpenObject: (id: string) => void;
}

const statusTone = (s: ProjectObject['status']) =>
  s === 'risk' ? 'hot' : s === 'done' ? 'ok' : 'wait';

const ProjectTabs = ({ projectTitle, objects, cabins, onOpenObject }: ProjectTabsProps) => {
  const [tab, setTab] = useState<Tab>('objects');
  const { users } = useUsers();
  const { items: vehicles } = useVehicles('vehicle');
  const { items: rollup } = useInspectorsRollup();

  const ids = useMemo(() => new Set(objects.map((o) => o.id)), [objects]);

  const inProject = useMemo(() => {
    const own = users.filter((u) => u.group === projectTitle);
    const pool = own.length
      ? own
      : users.filter((u) => ['inspector', 'engineer', 'coordinator'].includes(u.role));
    const rank = (r: string) => (r === 'engineer' ? 0 : r === 'coordinator' ? 1 : 2);
    return {
      all: pool
        .filter((u) => ['inspector', 'engineer', 'coordinator'].includes(u.role))
        .sort((a, b) => rank(a.role) - rank(b.role) || a.fio.localeCompare(b.fio, 'ru')),
      own: own.length > 0,
    };
  }, [users, projectTitle]);

  const projectVehicles = useMemo(() => {
    const bound = vehicles.filter((v) => ids.has(v.objectId));
    return bound.length ? bound : vehicles;
  }, [vehicles, ids]);

  const projectCabins = useMemo(() => {
    const bound = cabins.filter((v) => ids.has(v.objectId));
    return bound.length ? bound : cabins;
  }, [cabins, ids]);

  const shiftOf = (fio: string) => rollup.find((r) => r.fio === fio)?.shift ?? null;

  const body = () => {
    if (tab === 'objects') {
      return (
        <Panel title="Объекты проекта" note={`${objects.length}`}>
          {objects.length === 0 ? (
            <Empty
              icon="Building2"
              title="Объектов нет"
              hint="По этому проекту объекты ещё не внесены."
            />
          ) : (
            objects.map((o) => (
              <Row
                key={o.id}
                title={o.title}
                sub={`${o.regionName} · ${o.stage} · ${o.progress}%`}
                right={<Tag tone={statusTone(o.status)}>{STATUS_LABEL[o.status]}</Tag>}
                onClick={() => onOpenObject(o.id)}
              />
            ))
          )}
        </Panel>
      );
    }

    if (tab === 'staff') {
      return (
        <Panel
          title="Инспекторский состав"
          note={
            inProject.own
              ? `${inProject.all.length}`
              : `все инспекторы · ${inProject.all.length}`
          }
        >
          {inProject.all.length === 0 ? (
            <Empty
              icon="Users"
              title="Инспекторы не назначены"
              hint="Учётные записи создаёт администратор или менеджер проекта."
            />
          ) : (
            inProject.all.map((u) => {
              const shift = shiftOf(u.fio);
              return (
                <Row
                  key={u.id}
                  title={u.fio}
                  sub={`${ROLE_LABEL[u.role]} · ${
                    u.specialties?.length
                      ? u.specialties.join(', ')
                      : 'специализация не указана'
                  }`}
                  right={
                    shift ? (
                      <span className="flex flex-none flex-col items-end gap-1">
                        <Tag tone={shift.open ? 'ok' : 'dim'}>
                          {shift.open ? 'на вахте' : 'не на вахте'}
                        </Tag>
                        <span className="text-[0.72em] text-muted-foreground">
                          {shift.start}–{shift.end}
                        </span>
                      </span>
                    ) : (
                      <Tag tone="dim">вахта не открыта</Tag>
                    )
                  }
                />
              );
            })
          )}
        </Panel>
      );
    }

    if (tab === 'vehicles') {
      return (
        <Panel title="Транспорт проекта" note={`${projectVehicles.length}`}>
          {projectVehicles.length === 0 ? (
            <Empty
              icon="Truck"
              title="Техника не закреплена"
              hint="Автопарк ведёт механик в разделе «Активы»."
            />
          ) : (
            projectVehicles.map((v) => (
              <Row
                key={v.id}
                title={`${v.plate} · ${v.model}`}
                sub={`водитель: ${v.driver || 'не закреплён'}`}
                right={<Tag tone={v.status === 'На линии' ? 'ok' : 'wait'}>{v.status}</Tag>}
              />
            ))
          )}
        </Panel>
      );
    }

    return (
      <Panel title="Вагоны и бытовки" note={`${projectCabins.length}`}>
        {projectCabins.length === 0 ? (
          <Empty
            icon="Container"
            title="Вагоны не закреплены"
            hint="Жилые модули вносятся в разделе «Активы»."
          />
        ) : (
          projectCabins.map((v) => (
            <Row
              key={v.id}
              title={`${v.model}${v.invNo ? ` · инв. ${v.invNo}` : ''}`}
              sub={`${v.kind} · ${v.holder || 'ответственный не назначен'}`}
              right={<Tag tone={v.status === 'На линии' ? 'ok' : 'wait'}>{v.status}</Tag>}
            />
          ))
        )}
      </Panel>
    );
  };

  return (
    <>
      <div className="flex flex-none flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              'rounded-sm border px-3 py-1.5 text-[0.76em] uppercase tracking-[0.08em] transition-colors',
              tab === t.id
                ? 'border-accent bg-accent text-accent-foreground'
                : 'border-border bg-card hover:border-accent hover:bg-secondary',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      {body()}
    </>
  );
};

export default ProjectTabs;
