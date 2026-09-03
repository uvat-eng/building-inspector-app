import Panel from '@/components/desk/Panel';
import Empty from '@/components/desk/Empty';
import Icon from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import { Project, loadTone, pct, sumBy } from '@/components/desk/manager/project';

interface ProjectsListProps {
  projects: Project[];
  cabinObjectIds: string[];
  onOpen: (key: string) => void;
}

const Mini = ({ label, fact, plan }: { label: string; fact: number; plan: number }) => (
  <span className="flex min-w-[54px] flex-col items-center gap-0.5">
    <span className="font-head text-[0.95em] leading-none">
      <span className={cn(loadTone(fact, plan))}>{fact}</span>
      <span className="text-muted-foreground"> / {plan}</span>
    </span>
    <span className="text-[0.62em] uppercase tracking-[0.1em] text-muted-foreground">
      {label}
    </span>
  </span>
);

const ProjectsList = ({ projects, cabinObjectIds, onOpen }: ProjectsListProps) => (
  <Panel title="Проекты" note={`${projects.length}`}>
    {projects.length === 0 ? (
      <Empty
        icon="FolderTree"
        title="Проектов пока нет"
        hint="Месторождения и объекты вносит менеджер проекта."
      />
    ) : (
      <div className="grid gap-px bg-border">
        {projects.map((p) => {
          const staffPlan = sumBy(p.objects, (o) => o.staffPlan);
          const staffFact = sumBy(p.objects, (o) => o.staffFact);
          const techPlan = sumBy(p.objects, (o) => o.techPlan);
          const techFact = sumBy(p.objects, (o) => o.techFact);
          const cabinPlan = sumBy(p.objects, (o) => o.cabins);
          const ids = new Set(p.objects.map((o) => o.id));
          const cabinFact = cabinObjectIds.filter((id) => ids.has(id)).length;
          const done = pct(staffFact, staffPlan);

          return (
            <button
              key={p.key}
              type="button"
              onClick={() => onOpen(p.key)}
              className="group flex flex-wrap items-center gap-3 bg-card px-4 py-4 text-left transition-colors hover:bg-foreground hover:text-background"
            >
              <span className="flex h-11 w-11 flex-none items-center justify-center rounded-sm bg-accent text-accent-foreground">
                <Icon name="Layers" fallback="Folder" size={21} />
              </span>
              <span className="min-w-0 flex-1 basis-[180px]">
                <span className="block truncate font-head text-[1em] uppercase tracking-[0.03em]">
                  {p.title}
                </span>
                <span className="block truncate text-[0.78em] text-muted-foreground group-hover:text-background/70">
                  {p.locationTitle} · {p.objects.length} объектов · укомплектован на {done}%
                </span>
              </span>
              <span className="flex flex-none items-center gap-3 sm:gap-4">
                <Mini label="Инсп" fact={staffFact} plan={staffPlan} />
                <Mini label="Техн" fact={techFact} plan={techPlan} />
                <Mini label="Вагоны" fact={cabinFact} plan={cabinPlan} />
              </span>
              <Icon name="ChevronRight" size={18} className="flex-none opacity-40" />
            </button>
          );
        })}
      </div>
    )}
  </Panel>
);

export default ProjectsList;
