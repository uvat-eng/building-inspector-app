import { useMemo, useState } from 'react';
import Icon from '@/components/ui/icon';
import Tag from '@/components/desk/Tag';
import CabinetBar from '@/components/desk/CabinetBar';
import ChangePassword from '@/components/desk/ChangePassword';
import ProjectsList from '@/components/desk/manager/ProjectsList';
import ProjectLoad from '@/components/desk/manager/ProjectLoad';
import ProjectTabs from '@/components/desk/manager/ProjectTabs';
import ObjectRoutes from '@/components/desk/manager/ObjectRoutes';
import { Project } from '@/components/desk/manager/project';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import useBackGuard from '@/hooks/use-back-guard';
import { useObjects, NO_FIELD, STATUS_LABEL } from '@/data/store';
import { useFields } from '@/data/fields';
import { useLocations, locTitle } from '@/data/locations';
import { useUsers } from '@/data/users';
import { useProfile } from '@/data/profile';
import { useVehicles } from '@/data/vehicles';
import { useInspectorsRollup } from '@/data/rollup';
import WriteoffApprovals from '@/components/desk/outfit/WriteoffApprovals';

interface ManagerCabinetProps {
  onExit?: () => void;
}

const ManagerCabinet = ({ onExit }: ManagerCabinetProps) => {
  const { profile } = useProfile();
  const { current } = useUsers();
  const { list: objects } = useObjects();
  const { all: fields } = useFields();
  const { list: locations } = useLocations();
  const { items: cabins } = useVehicles('cabin');
  const { items: rollup } = useInspectorsRollup();

  const [openProject, setOpenProject] = useState<string | null>(null);
  const [openObject, setOpenObject] = useState<string | null>(null);
  const [passOpen, setPassOpen] = useState(false);

  const projects = useMemo<Project[]>(() => {
    const map = new Map<string, Project>();
    objects.forEach((o) => {
      const key = o.field?.trim() || NO_FIELD;
      const prev = map.get(key);
      if (prev) prev.objects.push(o);
      else
        map.set(key, {
          key,
          title: key,
          locationId: o.location ?? '',
          locationTitle: locTitle(locations, o.location ?? ''),
          objects: [o],
        });
    });
    fields.forEach((f) => {
      const key = f.title.trim();
      if (!key || map.has(key)) return;
      map.set(key, {
        key,
        title: key,
        locationId: f.locationId,
        locationTitle: locTitle(locations, f.locationId),
        objects: [],
      });
    });
    return [...map.values()].sort((a, b) => a.title.localeCompare(b.title, 'ru'));
  }, [objects, fields, locations]);

  const cabinObjectIds = useMemo(() => cabins.map((c) => c.objectId), [cabins]);

  const project = projects.find((p) => p.key === openProject) ?? null;
  const active = project?.objects.find((o) => o.id === openObject) ?? null;

  const onShift = useMemo(() => rollup.filter((r) => r.onShift).length, [rollup]);
  const ordersOpen = objects.reduce((s, o) => s + (o.ordersOpen || 0), 0);

  useBackGuard(!!project && !active, () => setOpenProject(null));

  const passButton = current && (
    <button
      type="button"
      onClick={() => setPassOpen(true)}
      className={cn(
        'flex items-center gap-1.5 rounded-sm border px-2.5 py-1 text-[0.78em] uppercase tracking-[0.08em] transition-colors',
        current.mustChangePassword
          ? 'border-accent bg-accent text-accent-foreground'
          : 'border-border bg-card hover:border-accent hover:bg-secondary',
      )}
    >
      <Icon name="KeyRound" size={14} />
      Пароль
    </button>
  );

  const passDialog = (
    <Dialog open={passOpen} onOpenChange={setPassOpen}>
      <DialogContent className="max-w-lg rounded-sm">
        <DialogHeader>
          <DialogTitle className="font-head text-[1.2em] uppercase tracking-[0.03em]">
            Смена пароля
          </DialogTitle>
          <DialogDescription className="text-[0.85em]">{current?.fio}</DialogDescription>
        </DialogHeader>
        {current && <ChangePassword user={current} onDone={() => setPassOpen(false)} />}
      </DialogContent>
    </Dialog>
  );

  if (project && active) {
    return (
      <>
        <ObjectRoutes
          object={active}
          crumbs={[
            {
              label: 'Руководитель проекта',
              icon: 'SquarePen',
              onClick: () => {
                setOpenObject(null);
                setOpenProject(null);
              },
            },
            { label: project.title, onClick: () => setOpenObject(null) },
          ]}
          backLabel="К проекту"
          onBack={() => setOpenObject(null)}
          onExit={onExit}
        />
        {passDialog}
      </>
    );
  }

  if (project) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-2.5">
        <CabinetBar
          crumbs={[
            {
              label: 'Руководитель проекта',
              icon: 'SquarePen',
              onClick: () => setOpenProject(null),
            },
            { label: project.title },
          ]}
          backLabel="К проектам"
          onBack={() => setOpenProject(null)}
          onExit={onExit}
          actions={passButton}
        />

        <div className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
          <section className="flex-none rounded-sm border border-border border-t-2 border-t-accent bg-card px-4 py-4 sm:px-6 sm:py-5">
            <p className="text-[0.72em] uppercase tracking-[0.14em] text-muted-foreground">
              Проект
            </p>
            <h1 className="mt-1 font-head text-[18px] uppercase leading-[1.15] tracking-[0.02em] sm:text-[26px]">
              {project.title}
            </h1>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Tag tone="dim">{project.locationTitle}</Tag>
              <Tag tone="dim">{project.objects.length} объектов</Tag>
              {project.objects[0] && (
                <Tag tone={project.objects[0].status === 'risk' ? 'hot' : 'wait'}>
                  {STATUS_LABEL[project.objects[0].status]}
                </Tag>
              )}
            </div>
          </section>

          <ProjectLoad objects={project.objects} cabinObjectIds={cabinObjectIds} />

          <ProjectTabs
            projectTitle={project.title}
            objects={project.objects}
            cabins={cabins}
            onOpenObject={(id) => setOpenObject(id)}
          />
        </div>

        {passDialog}
      </div>
    );
  }

  const counters = [
    { icon: 'Layers', label: 'Проектов', value: projects.length },
    { icon: 'Building2', label: 'Объектов', value: objects.length },
    { icon: 'HardHat', label: 'Инспекторов на вахте', value: onShift },
    { icon: 'FileWarning', label: 'Открытых предписаний', value: ordersOpen },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2.5">
      <CabinetBar
        crumbs={[{ label: 'Руководитель проекта', icon: 'SquarePen' }]}
        onExit={onExit}
        actions={passButton}
      />

      <div className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
        <section className="flex-none rounded-sm border border-border border-t-2 border-t-accent bg-card px-4 py-4 sm:px-6 sm:py-5">
          <h1 className="font-head text-[19px] uppercase leading-[1.15] tracking-[0.02em] sm:text-[28px]">
            Кабинет <span className="text-accent">руководителя проекта</span>
          </h1>
          <p className="mt-1.5 text-[0.88em] text-muted-foreground">
            {profile.fio || current?.fio || 'ФИО не указано'} ·{' '}
            {profile.org || current?.org || 'организация не указана'}
          </p>
        </section>

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

        <WriteoffApprovals />

        <ProjectsList
          projects={projects}
          cabinObjectIds={cabinObjectIds}
          onOpen={(key) => {
            setOpenProject(key);
            setOpenObject(null);
          }}
        />
      </div>

      {passDialog}
    </div>
  );
};

export default ManagerCabinet;